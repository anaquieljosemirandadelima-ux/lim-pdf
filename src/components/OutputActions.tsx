"use client";

import { CheckCircle2, Download, FileOutput, X } from "lucide-react";
import { clearPreparedOutput, downloadBlob, getPreparedOutput, humanSize, type OutputArtifact } from "@/lib/browser-files";
import { useEffect, useState } from "react";

function canPrint(artifact: OutputArtifact) {
  return artifact.blob.type === "application/pdf" || artifact.blob.type.startsWith("image/") || /\.(pdf|png|jpe?g)$/i.test(artifact.filename);
}

function openForPrinting(artifact: OutputArtifact) {
  const url = URL.createObjectURL(artifact.blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!printWindow) {
    URL.revokeObjectURL(url);
    return;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function OutputActions() {
  const [artifact, setArtifact] = useState<OutputArtifact | null>(() => getPreparedOutput());

  useEffect(() => {
    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<OutputArtifact>).detail;
      if (detail?.blob instanceof Blob && detail.filename) setArtifact(detail);
    };
    const handleClear = () => setArtifact(null);
    window.addEventListener("limpdf:output-ready", handleOutput);
    window.addEventListener("limpdf:output-clear", handleClear);
    return () => {
      window.removeEventListener("limpdf:output-ready", handleOutput);
      window.removeEventListener("limpdf:output-clear", handleClear);
    };
  }, []);

  if (!artifact) return null;

  return (
    <section className="output-actions" aria-label="Resultado pronto" aria-live="polite">
      <div className="output-actions-heading">
        <CheckCircle2 size={19} aria-hidden="true" />
        <span><strong>Resultado pronto</strong><small>{artifact.filename} · {humanSize(artifact.blob.size)}</small></span>
      </div>
      <div className="output-actions-buttons">
        {canPrint(artifact) ? <button type="button" className="primary-button" onClick={() => openForPrinting(artifact)}><FileOutput size={17} aria-hidden="true" /> Imprimir no computador</button> : null}
        <button type="button" className="secondary-button" onClick={() => downloadBlob(artifact.blob, artifact.filename)}><Download size={17} aria-hidden="true" /> Baixar resultado</button>
        <button type="button" className="output-actions-close" aria-label="Fechar ações do resultado" onClick={clearPreparedOutput}><X size={16} aria-hidden="true" /></button>
      </div>
    </section>
  );
}
