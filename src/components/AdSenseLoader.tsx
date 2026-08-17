"use client";

import { useEffect } from "react";
import { CONSENT_KEY } from "@/components/ConsentBanner";
import { ADSENSE_SCRIPT_SRC } from "@/lib/adsense";

const SCRIPT_ID = "limpdf-adsense-script";

declare global {
  interface Window {
    dataLayer?: unknown[];
    adsbygoogle?: unknown[];
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

    const removeAdSense = () => {
      document.getElementById(SCRIPT_ID)?.remove();
      document.querySelectorAll("script[src*='pagead2.googlesyndication.com/pagead/js/adsbygoogle.js']").forEach((node) => node.remove());
    };

    const loadAdSense = () => {
      if (document.getElementById(SCRIPT_ID)) return;
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = ADSENSE_SCRIPT_SRC;
      script.crossOrigin = "anonymous";
      script.dataset.adClient = client;
      document.head.appendChild(script);
    };

    const sync = () => {
      let accepted = false;
      try {
        accepted = window.localStorage.getItem(CONSENT_KEY) === "accepted";
      } catch {
        accepted = false;
      }
      applyConsentMode(accepted);
      if (accepted) loadAdSense();
      else removeAdSense();
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
