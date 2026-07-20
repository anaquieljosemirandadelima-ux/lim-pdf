"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Settings2, ShieldCheck, X } from "lucide-react";

export type ConsentValue = "accepted" | "essential";
export const CONSENT_KEY = "limpdf-consent-v1";

type ConsentSnapshot = ConsentValue | "missing";
function getSnapshot(): ConsentSnapshot { return (localStorage.getItem(CONSENT_KEY) as ConsentValue | null) || "missing"; }
function getServerSnapshot(): ConsentSnapshot { return "essential"; }
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
    localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new CustomEvent("limpdf:consent-change", { detail: value }));
    setForcedOpen(false);
  }

  useEffect(() => {
    const reopen = () => { setDetails(true); setForcedOpen(true); };
    window.addEventListener("limpdf:open-consent", reopen);
    return () => window.removeEventListener("limpdf:open-consent", reopen);
  }, []);

  if (consent !== "missing" && !forcedOpen) return null;
  return <div className="consent-backdrop" role="presentation"><section className="consent-card" role="dialog" aria-modal="true" aria-labelledby="consent-title"><button className="consent-close" type="button" aria-label="Fechar e usar somente recursos essenciais" onClick={() => save("essential")}><X size={18} /></button><span className="consent-icon"><ShieldCheck size={23} /></span><h2 id="consent-title">Sua privacidade no LIM PDF</h2><p>As ferramentas de PDF funcionam sem cookies de publicidade. Com sua autorização, serviços de anúncios e medição poderão ser carregados quando estiverem configurados.</p>{details ? <div className="consent-details"><div><strong>Essenciais</strong><small>Preferências, segurança e funcionamento básico. Sempre ativos.</small></div><div><strong>Publicidade e medição</strong><small>Permite carregar serviços configurados para sustentar e melhorar o site.</small></div></div> : null}<div className="consent-actions"><button className="primary-button" type="button" onClick={() => save("accepted")}>Aceitar opcionais</button><button className="secondary-button" type="button" onClick={() => save("essential")}>Somente essenciais</button></div><button className="consent-settings" type="button" onClick={() => setDetails((current) => !current)}><Settings2 size={15} /> {details ? "Ocultar detalhes" : "Ver detalhes"}</button><p className="consent-links"><Link href="/privacidade">Privacidade</Link> · <Link href="/cookies">Cookies</Link></p></section></div>;
}

export function PrivacyPreferencesButton() { return <button className="privacy-settings-button" type="button" onClick={() => window.dispatchEvent(new Event("limpdf:open-consent"))}>Preferências de privacidade</button>; }
