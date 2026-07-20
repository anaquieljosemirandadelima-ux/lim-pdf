"use client";

import { useEffect, useMemo, useState } from "react";
import { CONSENT_KEY } from "@/components/ConsentBanner";
import { ADSENSE_CLIENT } from "@/lib/adsense";

export type AdPlacement =
  | "home-top"
  | "home-bottom"
  | "catalog-side"
  | "catalog-inline"
  | "tool-inline"
  | "guides-side"
  | "guides-inline";

interface AdSlotProps {
  placement: AdPlacement;
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
}

declare global { interface Window { adsbygoogle?: unknown[] } }

export function AdSlot({ placement, format = "auto", className = "" }: AdSlotProps) {
  const client = ADSENSE_CLIENT;
  const slots = useMemo(() => ({
    "home-top": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP,
    "home-bottom": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM,
    "catalog-side": process.env.NEXT_PUBLIC_ADSENSE_SLOT_CATALOG_SIDE,
    "catalog-inline": process.env.NEXT_PUBLIC_ADSENSE_SLOT_CATALOG_INLINE,
    "tool-inline": process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOL_INLINE,
    "guides-side": process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDES_SIDE,
    "guides-inline": process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDES_INLINE,
  }), []);
  const slot = slots[placement];
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(localStorage.getItem(CONSENT_KEY) === "accepted");
    sync();
    window.addEventListener("limpdf:consent-change", sync);
    return () => window.removeEventListener("limpdf:consent-change", sync);
  }, []);

  useEffect(() => {
    if (!client || !slot || !allowed) return;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* bloqueador ou script ainda não carregado */ }
  }, [allowed, client, slot]);

  return (
    <aside className={`ad-shell ad-${format} ${className}`.trim()} aria-label="Publicidade">
      <span>Publicidade</span>
      {client && slot && allowed ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format === "rectangle" ? "rectangle" : "auto"}
          data-full-width-responsive="true"
        />
      ) : (
        <div className="ad-reserved-space">
          <strong>Espaço reservado para Google Ads</strong>
          <small>{format === "rectangle" ? "Formato retangular responsivo" : "Formato horizontal responsivo"}</small>
        </div>
      )}
    </aside>
  );
}
