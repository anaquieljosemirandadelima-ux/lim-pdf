"use client";

import { useEffect, useMemo, useState } from "react";
import { CONSENT_KEY } from "@/components/ConsentBanner";
import { ADSENSE_CLIENT } from "@/lib/adsense";

export type AdPlacement =
  | "home-top"
  | "home-bottom"
  | "catalog-side"
  | "catalog-inline"
  | "tool-inline";

interface AdSlotProps {
  placement: AdPlacement;
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({ placement, format = "auto", className = "" }: AdSlotProps) {
  const client = ADSENSE_CLIENT;
  const slots = useMemo(
    () => ({
      "home-top": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP,
      "home-bottom": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM,
      "catalog-side": process.env.NEXT_PUBLIC_ADSENSE_SLOT_CATALOG_SIDE,
      "catalog-inline": process.env.NEXT_PUBLIC_ADSENSE_SLOT_CATALOG_INLINE,
      "tool-inline": process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOL_INLINE,
    }),
    [],
  );
  const slot = slots[placement];
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(localStorage.getItem(CONSENT_KEY) === "accepted");
    sync();
    window.addEventListener("limpdf:consent-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("limpdf:consent-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!client || !slot || !allowed) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers or delayed external scripts can prevent ad rendering.
    }
  }, [allowed, client, slot]);

  if (!client || !slot || !allowed) return null;

  return (
    <aside className={`ad-shell ad-${format} ${className}`.trim()} aria-label="Publicidade">
      <span>Publicidade</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format === "rectangle" ? "rectangle" : "auto"}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
