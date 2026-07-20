import { NextResponse } from "next/server";

const MAX_BODY_LENGTH = 5000;

export async function POST(request: Request) {
  const webhook = process.env.CONTACT_WEBHOOK_URL;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  const value = body as Record<string, unknown>;
  if (typeof value.website === "string" && value.website.trim()) return NextResponse.json({ ok: true });
  const name = typeof value.name === "string" ? value.name.trim().slice(0, 100) : "";
  const email = typeof value.email === "string" ? value.email.trim().slice(0, 160) : "";
  const subject = typeof value.subject === "string" ? value.subject.trim().slice(0, 160) : "";
  const message = typeof value.message === "string" ? value.message.trim().slice(0, 3000) : "";
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !subject || message.length < 20) return NextResponse.json({ ok: false, error: "invalid_fields" }, { status: 400 });
  if (JSON.stringify({ name, email, subject, message }).length > MAX_BODY_LENGTH) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  if (!webhook) return NextResponse.json({ ok: false, error: "contact_not_configured" }, { status: 503 });
  try {
    const response = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, subject, message, source: "LIM PDF", receivedAt: new Date().toISOString() }), signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("webhook_failed");
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false, error: "delivery_failed" }, { status: 502 }); }
}
