import type { AllToolSlug } from "@/lib/all-tools";

export type ToolMetricEvent = "tool_view" | "file_selected" | "process_started" | "process_success" | "process_error";

type MetricPayload = {
  event: ToolMetricEvent;
  tool: AllToolSlug;
  inputSizeBucket?: string;
  outputSizeBucket?: string;
  durationBucket?: string;
  fileCount?: number;
  errorCode?: "ui_error" | "uncaught_error" | "unhandled_rejection";
};

function sizeBucket(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "unknown";
  if (bytes < 512 * 1024) return "lt_512kb";
  if (bytes < 2 * 1024 * 1024) return "512kb_2mb";
  if (bytes < 10 * 1024 * 1024) return "2mb_10mb";
  if (bytes < 30 * 1024 * 1024) return "10mb_30mb";
  return "gte_30mb";
}

function durationBucket(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "unknown";
  if (milliseconds < 500) return "lt_500ms";
  if (milliseconds < 2_000) return "500ms_2s";
  if (milliseconds < 5_000) return "2s_5s";
  if (milliseconds < 15_000) return "5s_15s";
  return "gte_15s";
}

function browserFamily() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/OPR\//.test(ua)) return "opera";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

function shouldSample(event: ToolMetricEvent) {
  if (event === "process_error") return { send: true, rate: 1 };
  const rate = event === "process_success" ? 0.5 : event === "process_started" ? 0.35 : 0.2;
  return { send: Math.random() <= rate, rate };
}

export function bytesBucket(bytes: number) {
  return sizeBucket(bytes);
}

export function timeBucket(milliseconds: number) {
  return durationBucket(milliseconds);
}

export function sendToolMetric(payload: MetricPayload) {
  if (typeof window === "undefined") return;
  const sample = shouldSample(payload.event);
  if (!sample.send) return;
  const body = JSON.stringify({
    v: 1,
    ...payload,
    browser: browserFamily(),
    sampleRate: sample.rate,
  });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/telemetry", blob)) return;
    }
    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    });
  } catch {
    // Telemetria nunca pode interromper uma ferramenta.
  }
}
