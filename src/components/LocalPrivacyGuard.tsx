"use client";

import { useEffect } from "react";
import { cleanupExpiredEditorImageAssets } from "@/lib/editor-assets";
import { cleanupExpiredEditorDrafts } from "@/lib/editor-drafts";
import { getTemporaryCacheStatus } from "@/lib/temporary-cache";

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export function LocalPrivacyGuard() {
  useEffect(() => {
    const cleanup = () => {
      cleanupExpiredEditorDrafts();
      void cleanupExpiredEditorImageAssets().catch(() => undefined);
      void getTemporaryCacheStatus().catch(() => undefined);
    };

    cleanup();
    const interval = window.setInterval(cleanup, CLEANUP_INTERVAL_MS);
    window.addEventListener("storage", cleanup);
    window.addEventListener("visibilitychange", cleanup);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", cleanup);
      window.removeEventListener("visibilitychange", cleanup);
    };
  }, []);

  return null;
}
