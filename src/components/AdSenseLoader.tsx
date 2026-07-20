"use client";

import Script from "next/script";
import { ADSENSE_SCRIPT_SRC } from "@/lib/adsense";

export function AdSenseLoader({ client }: { client?: string }) {
  if (!client) return null;

  return (
    <Script
      id="limpdf-adsense"
      src={ADSENSE_SCRIPT_SRC}
      strategy="afterInteractive"
      crossOrigin="anonymous"
      async
    />
  );
}
