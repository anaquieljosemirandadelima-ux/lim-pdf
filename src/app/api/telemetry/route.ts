import { NextRequest, NextResponse } from "next/server";
import { allToolBySlug, type AllToolSlug } from "@/lib/all-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 4096;
const EVENTS = new Set(["tool_view", "file_selected", "process_started", "process_success", "process_error"]);
const BROWSERS = new Set(["chrome", "edge", "firefox", "safari", "opera", "other", "unknown"]);
const SIZE_BUCKETS = new Set(["unknown", "lt_512kb", "512kb_2mb", "2mb_10mb", "10mb_30mb", "gte_30mb"]);
const DURATION_BUCKETS = new Set(["unknown", "lt_500ms", "500ms_2s", "2s_5s", "5s_15s", "gte_15s"]);
const ERROR_CODES = new Set(["ui_error", "uncaught_error", "unhandled_rejection"]);
const STANDALONE_TOOLS = new Set(["converter-pdf", "ocr-pdf", "dimensionar-pdf", "preflight-pdf"]);

type IncomingMetric = {
  v?: unknown;
  event?: unknown;
  tool?: unknown;
  browser?: unknown;
  sampleRate?: unknown;
  inputSizeBucket?: unknown;
  outputSizeBucket?: unknown;
  durationBucket?: unknown;
  fileCount?: unknown;
  errorCode?: unknown;
};

type BodyReadResult =
  | { ok: true; value: IncomingMetric }
  | { ok: false; error: "invalid_json" | "payload_too_large" };

function validOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const directHost = request.headers.get("host")?.trim();
    const allowedHosts = new Set([request.nextUrl.host, forwardedHost, directHost].filter((value): value is string => Boolean(value)));
    return allowedHosts.has(originHost);
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
        return { ok: false, error: "payload_too_large" };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: "invalid_json" };
    return { ok: true, value: parsed as IncomingMetric };
  } catch {
    return { ok: false, error: "invalid_json" };
  } finally {
    try { reader.releaseLock(); } catch { /* stream already released */ }
  }
}

function knownToolSlug(value: string) {
  return allToolBySlug.has(value as AllToolSlug) || STANDALONE_TOOLS.has(value);
}

function normalizedMetric(body: IncomingMetric) {
  if (body.v !== 1 || typeof body.event !== "string" || !EVENTS.has(body.event)) return null;
  if (typeof body.tool !== "string" || !knownToolSlug(body.tool)) return null;
  if (typeof body.browser !== "string" || !BROWSERS.has(body.browser)) return null;
  const sampleRate = typeof body.sampleRate === "number" && body.sampleRate > 0 && body.sampleRate <= 1 ? body.sampleRate : 1;
  const metric: Record<string, string | number> = {
    v: 1,
    event: body.event,
    tool: body.tool,
    browser: body.browser,
    sampleRate,
    sampleWeight: Number((1 / sampleRate).toFixed(2)),
  };
  if (typeof body.inputSizeBucket === "string" && SIZE_BUCKETS.has(body.inputSizeBucket)) metric.inputSizeBucket = body.inputSizeBucket;
  if (typeof body.outputSizeBucket === "string" && SIZE_BUCKETS.has(body.outputSizeBucket)) metric.outputSizeBucket = body.outputSizeBucket;
  if (typeof body.durationBucket === "string" && DURATION_BUCKETS.has(body.durationBucket)) metric.durationBucket = body.durationBucket;
  if (typeof body.fileCount === "number" && Number.isInteger(body.fileCount) && body.fileCount >= 1 && body.fileCount <= 100) metric.fileCount = body.fileCount;
  if (typeof body.errorCode === "string" && ERROR_CODES.has(body.errorCode)) metric.errorCode = body.errorCode;
  return metric;
}

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }

  const rawLength = request.headers.get("content-length");
  if (rawLength) {
    const contentLength = Number(rawLength);
    if (!Number.isFinite(contentLength) || contentLength < 0) return NextResponse.json({ error: "invalid_length" }, { status: 400 });
    if (contentLength > MAX_REQUEST_BYTES) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  const bodyResult = await readJsonBodyWithLimit(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.error === "payload_too_large" ? 413 : 400 });
  }
  const metric = normalizedMetric(bodyResult.value);
  if (!metric) return NextResponse.json({ error: "invalid_metric" }, { status: 400 });

  // Nunca registrar nome do arquivo, conteúdo do PDF, texto digitado, IP ou User-Agent bruto.
  console.info("limpdf_telemetry", JSON.stringify(metric));
  return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
}
