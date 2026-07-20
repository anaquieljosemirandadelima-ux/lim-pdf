"use client";

import { useEffect } from "react";
import { CONSENT_KEY } from "@/components/ConsentBanner";

export function AdSenseLoader({ client }: { client?: string }) {
  useEffect(() => {
    if (!client) return;
    function load() {
      if (localStorage.getItem(CONSENT_KEY) !== "accepted" || document.querySelector("script[data-limpdf-adsense]")) return;
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.limpdfAdsense = "true";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      document.head.appendChild(script);
    }
    load();
    window.addEventListener("limpdf:consent-change", load);
    return () => window.removeEventListener("limpdf:consent-change", load);
  }, [client]);
  return null;
}
