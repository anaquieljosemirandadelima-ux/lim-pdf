"use client";

import { useEffect, useRef } from "react";
import type { AllToolSlug } from "@/lib/all-tools";
import { bytesBucket, measurementConsentGranted, sendToolMetric, timeBucket } from "@/lib/tool-telemetry";

type DownloadDetail = { bytes?: number; extension?: string };

const PRIMARY_UPLOAD_ZONE = ".drop-zone,.studio-upload-card,.editor-upload-card";

export function ToolTelemetryBridge({ toolSlug }: { toolSlug: AllToolSlug }) {
  const processStartedAt = useRef<number | null>(null);
  const inputSizeBucket = useRef("unknown");
  const lastUiError = useRef("");
  const viewSent = useRef(false);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".reference-tool-page");
    if (!root) return;

    const sendViewAfterConsent = () => {
      if (viewSent.current || !measurementConsentGranted()) return;
      viewSent.current = true;
      sendToolMetric({ event: "tool_view", tool: toolSlug });
    };
    sendViewAfterConsent();

    const recordFiles = (files: FileList | File[]) => {
      if (!files.length) return;
      const list = Array.from(files);
      const total = list.reduce((sum, file) => sum + file.size, 0);
      inputSizeBucket.current = bytesBucket(total);
      sendToolMetric({ event: "file_selected", tool: toolSlug, inputSizeBucket: inputSizeBucket.current, fileCount: list.length });
    };

    const onChange = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "file" || !input.files?.length) return;
      if (!input.closest(PRIMARY_UPLOAD_ZONE)) return;
      recordFiles(input.files);
    };

    const onDrop = (event: DragEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest(PRIMARY_UPLOAD_ZONE) || !event.dataTransfer?.files.length) return;
      recordFiles(event.dataTransfer.files);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
      if (!target || target.disabled) return;
      if (target.matches(".process-button,.studio-top-actions .primary-button,.editor-top-actions .primary-button") || /baixar pdf|processar agora|agora$/i.test(target.textContent || "")) {
        processStartedAt.current = performance.now();
        sendToolMetric({ event: "process_started", tool: toolSlug, inputSizeBucket: inputSizeBucket.current });
      }
    };

    const onDownload = (event: Event) => {
      const detail = (event as CustomEvent<DownloadDetail>).detail || {};
      const duration = processStartedAt.current === null ? undefined : performance.now() - processStartedAt.current;
      sendToolMetric({
        event: "process_success",
        tool: toolSlug,
        inputSizeBucket: inputSizeBucket.current,
        outputSizeBucket: bytesBucket(Number(detail.bytes || 0)),
        durationBucket: duration === undefined ? "unknown" : timeBucket(duration),
      });
      processStartedAt.current = null;
    };

    const scanUiError = () => {
      const node = root.querySelector<HTMLElement>(".status-message.error,.status-message.status-error,.advanced-status.error,.editor-status.error,.studio-status.error,[data-status='error']");
      const fingerprint = node ? `${node.className}:${node.textContent?.slice(0, 48) || ""}` : "";
      if (!fingerprint) {
        lastUiError.current = "";
        return;
      }
      if (fingerprint === lastUiError.current) return;
      lastUiError.current = fingerprint;
      const duration = processStartedAt.current === null ? undefined : performance.now() - processStartedAt.current;
      sendToolMetric({
        event: "process_error",
        tool: toolSlug,
        inputSizeBucket: inputSizeBucket.current,
        durationBucket: duration === undefined ? "unknown" : timeBucket(duration),
        errorCode: "ui_error",
      });
      processStartedAt.current = null;
    };

    const onError = () => {
      if (processStartedAt.current === null) return;
      sendToolMetric({ event: "process_error", tool: toolSlug, inputSizeBucket: inputSizeBucket.current, durationBucket: timeBucket(performance.now() - processStartedAt.current), errorCode: "uncaught_error" });
      processStartedAt.current = null;
    };
    const onRejection = () => {
      if (processStartedAt.current === null) return;
      sendToolMetric({ event: "process_error", tool: toolSlug, inputSizeBucket: inputSizeBucket.current, durationBucket: timeBucket(performance.now() - processStartedAt.current), errorCode: "unhandled_rejection" });
      processStartedAt.current = null;
    };
    const observer = new MutationObserver(scanUiError);
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "data-status"] });
    root.addEventListener("change", onChange, true);
    root.addEventListener("drop", onDrop, true);
    root.addEventListener("click", onClick, true);
    window.addEventListener("limpdf:download", onDownload as EventListener);
    window.addEventListener("limpdf:consent-change", sendViewAfterConsent);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      observer.disconnect();
      root.removeEventListener("change", onChange, true);
      root.removeEventListener("drop", onDrop, true);
      root.removeEventListener("click", onClick, true);
      window.removeEventListener("limpdf:download", onDownload as EventListener);
      window.removeEventListener("limpdf:consent-change", sendViewAfterConsent);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [toolSlug]);

  return null;
}
