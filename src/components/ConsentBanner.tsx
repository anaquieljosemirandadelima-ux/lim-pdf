"use client";

import Link from "next/link";
import { Cookie, Settings2, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

export type ConsentValue = "accepted" | "essential";
export const CONSENT_KEY = "limpdf-consent-v1";

type ConsentSnapshot = ConsentValue | "missing";
function getSnapshot(): ConsentSnapshot {
  try {
    return (localStorage.getItem(CONSENT_KEY) as ConsentValue | null) || "missing";
  } catch {
    return "essential";
  }
}
function getServerSnapshot(): ConsentSnapshot { return "missing"; }
function subscribe(callback: () => void) {
  const handler = () => callback();
  window.addEventListener("limpdf:consent-change", handler);
  window.addEventListener("storage", handler);
  return () => { window.removeEventListener("limpdf:consent-change", handler); window.removeEventListener("storage", handler); };
}

export function ConsentBanner() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [forcedOpen, setForcedOpen] = useState(false);
  const [details, setDetails] = useState(false);

  function save(value: ConsentValue) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Alguns browsers bloqueiam storage; a escolha ainda vale para esta sessão.
    }
    window.dispatchEvent(new CustomEvent("limpdf:consent-change", { detail: value }));
    setForcedOpen(false);
    setDetails(false);
  }

  useEffect(() => {
    const reopen = () => { setDetails(true); setForcedOpen(true); };
    window.addEventListener("limpdf:open-consent", reopen);
    return () => window.removeEventListener("limpdf:open-consent", reopen);
  }, []);

  if (consent !== "missing" && !forcedOpen) return null;

  return (
    <section className="consent-toast" role="dialog" aria-modal="false" aria-labelledby="consent-title">
      <button className="consent-close" type="button" aria-label="Fechar e usar somente cookies essenciais" onClick={() => save("essential")}><X size={16} /></button>
      <div className="consent-copy">
        <span className="consent-icon"><Cookie size={18} /></span>
        <div>
          <strong id="consent-title">Cookies no LIM PDF</strong>
          <p>Usamos cookies essenciais para o site funcionar. Com sua permissão, também usamos publicidade e medição.</p>
        </div>
      </div>
      {details ? <div id="consent-details" className="consent-details">
        <span><strong>Essenciais</strong><small>Sempre ativos para preferências e funcionamento.</small></span>
        <span><strong>Publicidade e medição</strong><small>Carregados somente depois da sua autorização.</small></span>
        <span className="consent-links"><Link href="/privacidade">Privacidade</Link><Link href="/cookies">Cookies</Link></span>
      </div> : null}
      <div className="consent-actions">
        <button className="primary-button" type="button" onClick={() => save("accepted")}>Aceitar</button>
        <button className="secondary-button" type="button" onClick={() => save("essential")}>Só essenciais</button>
        <button className="consent-settings" type="button" aria-expanded={details} aria-controls="consent-details" onClick={() => setDetails((current) => !current)}><Settings2 size={14} /> {details ? "Menos" : "Opções"}</button>
      </div>
    </section>
  );
}

export function PrivacyPreferencesButton() {
  return <button className="privacy-settings-button" type="button" aria-haspopup="dialog" onClick={() => window.dispatchEvent(new Event("limpdf:open-consent"))}>Preferências de cookies</button>;
}
