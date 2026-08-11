"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdSenseLoader } from "@/components/AdSenseLoader";

const AD_SELECTORS = [
  "ins.adsbygoogle",
  ".google-auto-placed",
  "iframe[id^='google_ads_iframe']",
  "iframe[src*='googleads.g.doubleclick.net']",
  "iframe[src*='tpc.googlesyndication.com']",
  "div[id^='google_ads_iframe']",
  "div[id^='google_vignette']",
].join(",");

function purgeAdSenseFromInteractiveRoute() {
  document.getElementById("limpdf-adsense-script")?.remove();
  document.querySelectorAll("script[src*='pagead2.googlesyndication.com/pagead/js/adsbygoogle.js']").forEach((node) => node.remove());
  document.querySelectorAll(AD_SELECTORS).forEach((node) => node.remove());
  try { window.adsbygoogle = []; } catch { /* runtime externo pode tornar a propriedade não gravável */ }
}

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

export function AdSenseRouteLoader({ client }: { client?: string }) {
  const pathname = usePathname();
  const interactiveWorkspace = pathname.startsWith("/ferramentas/");

  useEffect(() => {
    if (!interactiveWorkspace) {
      document.body.classList.remove("limpdf-no-ads");
      return;
    }

    document.body.classList.add("limpdf-no-ads");
    purgeAdSenseFromInteractiveRoute();
    const observer = new MutationObserver(() => purgeAdSenseFromInteractiveRoute());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.body.classList.remove("limpdf-no-ads");
    };
  }, [interactiveWorkspace, pathname]);

  if (interactiveWorkspace) return null;
  return <AdSenseLoader client={client} />;
}
