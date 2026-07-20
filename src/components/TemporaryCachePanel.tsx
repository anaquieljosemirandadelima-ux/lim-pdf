"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
  const [clearing, setClearing] = useState(false);

  async function refresh() {
    setStatus(await getTemporaryCacheStatus());
  }

  useEffect(() => {
    void getTemporaryCacheStatus().then((nextStatus) => setStatus(nextStatus));
  }, []);

  async function clearNow() {
    setClearing(true);
    await clearAllTemporaryFiles();
    await refresh();
    setClearing(false);
  }

  return (
    <section className="local-cache-panel" aria-labelledby="local-cache-title">
      <div>
        <span className="eyebrow">Cache local</span>
        <h2 id="local-cache-title">Arquivos temporários neste dispositivo</h2>
        <p>O cache fica no IndexedDB do navegador, não no servidor do LIM PDF. Ele ajuda a recuperar tarefas interrompidas e expira automaticamente em até 4 horas.</p>
      </div>
      <dl>
        <div><dt>Tarefas armazenadas</dt><dd>{status?.sessionCount ?? "..."}</dd></div>
        <div><dt>Arquivos</dt><dd>{status?.fileCount ?? "..."}</dd></div>
        <div><dt>Espaço usado</dt><dd>{status ? formatBytes(status.totalBytes) : "..."}</dd></div>
        <div><dt>Próxima expiração</dt><dd>{status ? formatExpiry(status.expiresAt) : "..."}</dd></div>
      </dl>
      <button className="secondary-button" type="button" onClick={clearNow} disabled={clearing || !status?.sessionCount}>
        <Trash2 size={16} /> {clearing ? "Apagando..." : "Apagar arquivos temporários agora"}
      </button>
    </section>
  );
}
