import { NextRequest, NextResponse } from "next/server";
import { allToolBySlug, type AllToolSlug } from "@/lib/all-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENTS = new Set(["tool_view", "file_selected", "process_started", "process_success", "process_error"]);
const BROWSERS = new Set(["chrome", "edge", "firefox", "safari", "opera", "other", "unknown"]);
const SIZE_BUCKETS = new Set(["unknown", "lt_512kb", "512kb_2mb", "2mb_10mb", "10mb_30mb", "gte_30mb"]);
const DURATION_BUCKETS = new Set(["unknown", "lt_500ms", "500ms_2s", "2s_5s", "5s_15s", "gte_15s"]);
const ERROR_CODES = new Set(["ui_error", "uncaught_error", "unhandled_rejection"]);

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

function normalizedMetric(body: IncomingMetric) {
  if (body.v !== 1 || typeof body.event !== "string" || !EVENTS.has(body.event)) return null;
  if (typeof body.tool !== "string" || !allToolBySlug.has(body.tool as AllToolSlug)) return null;
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
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  let body: IncomingMetric;
  try {
    body = await request.json() as IncomingMetric;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const metric = normalizedMetric(body);
  if (!metric) return NextResponse.json({ error: "invalid_metric" }, { status: 400 });

  // Nunca registrar nome do arquivo, conteúdo do PDF, texto digitado, IP ou User-Agent bruto.
  console.info("limpdf_telemetry", JSON.stringify(metric));
  return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
}
