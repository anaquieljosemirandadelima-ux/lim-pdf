"use client";

import { useEffect, useState } from "react";
import { clearAllEditorDrafts, getEditorDraftStorageStatus } from "@/lib/editor-drafts";
import { clearAllTemporaryFiles, getTemporaryCacheStatus, type TemporaryCacheStatus } from "@/lib/temporary-cache";

const EMPTY_CACHE: TemporaryCacheStatus = { sessionCount: 0, fileCount: 0, totalBytes: 0, expiresAt: null };

function formatBytes(bytes: number) {
  if (!bytes) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;
}

export function LocalPrivacyPanel() {
  const [cache, setCache] = useState<TemporaryCacheStatus>(EMPTY_CACHE);
  const [draftCount, setDraftCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const [nextCache, drafts] = await Promise.all([
      getTemporaryCacheStatus().catch(() => EMPTY_CACHE),
      Promise.resolve(getEditorDraftStorageStatus()),
    ]);
    setCache(nextCache);
    setDraftCount(drafts.draftCount);
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void refresh(); });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function clearLocalData() {
    await clearAllTemporaryFiles().catch(() => undefined);
    clearAllEditorDrafts();
    try {
      window.localStorage.removeItem("limpdf:tool-recents:v2");
      window.localStorage.removeItem("limpdf:tool-favorites:v2");
    } catch {
      // A limpeza do cache IndexedDB continua a ser tentada mesmo com storage bloqueado.
    }
    setMessage("Dados locais apagados neste dispositivo.");
    await refresh();
  }

  return (
    <div className="local-privacy-panel">
      <button type="button" className="privacy-settings-button" aria-expanded={open} aria-controls="local-privacy-details" onClick={() => setOpen((value) => !value)}>
        Privacidade local
      </button>
      {open ? <div id="local-privacy-details" className="local-privacy-details" role="region" aria-label="Privacidade local">
        <p>Os ficheiros e rascunhos usados pelas ferramentas ficam neste dispositivo e expiram automaticamente.</p>
        <div className="local-privacy-stats"><span><strong>{cache.fileCount}</strong> ficheiros em cache</span><span><strong>{formatBytes(cache.totalBytes)}</strong> armazenados</span><span><strong>{draftCount}</strong> rascunhos</span></div>
        <button type="button" className="secondary-button" onClick={() => void clearLocalData()}>Apagar dados locais</button>
        {message ? <span className="local-privacy-message" role="status">{message}</span> : null}
      </div> : null}
    </div>
  );
}
