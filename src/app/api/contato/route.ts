import { NextResponse } from "next/server";

const MAX_BODY_LENGTH = 5000;
const MAX_REQUEST_BYTES = MAX_BODY_LENGTH * 2;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const ALLOWED_SUBJECTS = new Set([
  "Falha em uma ferramenta",
  "Sugestão de nova função",
  "Privacidade e dados pessoais",
  "Segurança",
  "Direitos autorais ou abuso",
  "Outro assunto",
]);

type RateEntry = { count: number; resetAt: number };
type BodyReadResult =
  | { ok: true; value: unknown }
  | { ok: false; error: "invalid_json" | "too_large" };

declare global {
  var limPdfContactRateLimit: Map<string, RateEntry> | undefined;
}

function rateLimitStore() {
  globalThis.limPdfContactRateLimit ??= new Map<string, RateEntry>();
  return globalThis.limPdfContactRateLimit;
}

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function consumeRateLimit(key: string, now = Date.now()) {
  const store = rateLimitStore();
  for (const [storedKey, entry] of store) {
    if (entry.resetAt <= now) store.delete(storedKey);
  }
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  store.set(key, current);
  return { allowed: true, retryAfter: 0 };
}

function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function readJsonBodyWithLimit(request: Request): Promise<BodyReadResult> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, error: "invalid_json" };
  const decoder = new TextDecoder();
  let text = "";
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return { ok: false, error: "too_large" };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: "invalid_json" };
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, error: "unsupported_media_type" }, { status: 415 });
  }

  const rawLength = request.headers.get("content-length");
  if (rawLength) {
    const declaredLength = Number(rawLength);
    if (!Number.isFinite(declaredLength) || declaredLength < 0) {
      return NextResponse.json({ ok: false, error: "invalid_length" }, { status: 400 });
    }
    if (declaredLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
    }
  }

  const limit = consumeRateLimit(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } },
    );
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  const bodyResult = await readJsonBodyWithLimit(request);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { ok: false, error: bodyResult.error },
      { status: bodyResult.error === "too_large" ? 413 : 400 },
    );
  }
  const body = bodyResult.value;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const value = body as Record<string, unknown>;
  if (typeof value.website === "string" && value.website.trim()) {
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const name = typeof value.name === "string" ? value.name.trim().slice(0, 100) : "";
  const email = typeof value.email === "string" ? value.email.trim().slice(0, 160) : "";
  const subject = typeof value.subject === "string" ? value.subject.trim().slice(0, 160) : "";
  const message = typeof value.message === "string" ? value.message.trim().slice(0, 3000) : "";
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !ALLOWED_SUBJECTS.has(subject) || message.length < 20) {
    return NextResponse.json({ ok: false, error: "invalid_fields" }, { status: 400 });
  }

  const payload = { name, email, subject, message, source: "LIM PDF", receivedAt: new Date().toISOString() };
  if (JSON.stringify(payload).length > MAX_BODY_LENGTH) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }
  if (!webhook) {
    return NextResponse.json({ ok: false, error: "contact_not_configured" }, { status: 503 });
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("webhook_failed");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "delivery_failed" }, { status: 502 });
  }
}
