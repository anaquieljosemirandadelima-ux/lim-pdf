"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { clearAllEditorImageAssets } from "@/lib/editor-assets";
import {
  clearAllEditorDrafts,
  getEditorDraftStorageStatus,
  type EditorDraftStorageStatus,
} from "@/lib/editor-drafts";
import { clearAllTemporaryFiles, getTemporaryCacheStatus, type TemporaryCacheStatus } from "@/lib/temporary-cache";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatExpiry(value: number | null) {
  if (!value) return "Nenhum cache ativo";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function TemporaryCachePanel() {
  const [status, setStatus] = useState<TemporaryCacheStatus | null>(null);
  const [draftStatus, setDraftStatus] = useState<EditorDraftStorageStatus | null>(null);
  const [clearing, setClearing] = useState(false);

  async function refresh() {
    const nextStatus = await getTemporaryCacheStatus();
    setStatus(nextStatus);
    setDraftStatus(getEditorDraftStorageStatus());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function clearNow() {
    setClearing(true);
    await Promise.all([clearAllTemporaryFiles(), clearAllEditorImageAssets()]);
    clearAllEditorDrafts();
    await refresh();
    setClearing(false);
  }

  const totalBytes = (status?.totalBytes || 0) + (draftStatus?.totalBytes || 0);
  const nextExpiry = [status?.expiresAt, draftStatus?.expiresAt]
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b)[0] ?? null;
  const hasLocalData = Boolean(status?.sessionCount || draftStatus?.draftCount);

  return (
    <section className="local-cache-panel" aria-labelledby="local-cache-title">
      <div>
        <span className="eyebrow">Cache local</span>
        <h2 id="local-cache-title">Dados temporários neste dispositivo</h2>
        <p>Arquivos de tarefas e imagens do editor ficam no IndexedDB; metadados dos rascunhos ficam no armazenamento local. Nenhum desses dados é enviado ao servidor do LIM PDF e todos expiram em até 4 horas.</p>
      </div>
      <dl>
        <div><dt>Tarefas armazenadas</dt><dd>{status?.sessionCount ?? "..."}</dd></div>
        <div><dt>Rascunhos do editor</dt><dd>{draftStatus?.draftCount ?? "..."}</dd></div>
        <div><dt>Espaço contabilizado</dt><dd>{status && draftStatus ? formatBytes(totalBytes) : "..."}</dd></div>
        <div><dt>Próxima expiração</dt><dd>{status && draftStatus ? formatExpiry(nextExpiry) : "..."}</dd></div>
      </dl>
      <button className="secondary-button" type="button" onClick={clearNow} disabled={clearing || !hasLocalData}>
        <Trash2 size={16} /> {clearing ? "Apagando..." : "Apagar todos os dados temporários agora"}
      </button>
    </section>
  );
}
