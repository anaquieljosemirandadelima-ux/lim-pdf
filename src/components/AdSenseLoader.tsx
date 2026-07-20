"use client";

import { useEffect } from "react";
import { CONSENT_KEY } from "@/components/ConsentBanner";
import { ADSENSE_SCRIPT_SRC } from "@/lib/adsense";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function AdSenseLoader({ client }: { client?: string }) {
  useEffect(() => {
    if (!client) return;

    const applyConsentMode = (accepted: boolean) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "limpdf_consent_update",
        ad_storage: accepted ? "granted" : "denied",
        analytics_storage: accepted ? "granted" : "denied",
        ad_user_data: accepted ? "granted" : "denied",
        ad_personalization: accepted ? "granted" : "denied",
      });
    };

    const sync = () => {
      const accepted = window.localStorage.getItem(CONSENT_KEY) === "accepted";
      applyConsentMode(accepted);
      const existing = document.getElementById("limpdf-adsense");
      if (!accepted) {
        existing?.remove();
        return;
      }
      if (existing) return;

      const script = document.createElement("script");
      script.id = "limpdf-adsense";
      script.async = true;
      script.src = ADSENSE_SCRIPT_SRC;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    };

    sync();
    window.addEventListener("limpdf:consent-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("limpdf:consent-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [client]);

  return null;
}
