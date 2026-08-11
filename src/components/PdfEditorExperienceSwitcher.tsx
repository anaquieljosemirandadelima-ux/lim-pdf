"use client";

import dynamic from "next/dynamic";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

const PdfEditorStudio = dynamic(() => import("@/components/PdfEditorStudio").then((module) => module.PdfEditorStudio), {
  loading: () => <div className="editor-mode-loading" role="status">Preparando o Studio…</div>,
});
const PdfEditorWorkspaceHardened = dynamic(() => import("@/components/PdfEditorWorkspaceHardened").then((module) => module.PdfEditorWorkspaceHardened), {
  loading: () => <div className="editor-mode-loading" role="status">Preparando o modo preciso…</div>,
});

type EditorMode = "studio" | "precise";

export function PdfEditorExperienceSwitcher() {
  const [mode, setMode] = useState<EditorMode>("studio");

  return (
    <section className="editor-experience-switcher">
      <div className="editor-mode-tabs" role="tablist" aria-label="Modo de edição">
        <button type="button" role="tab" aria-selected={mode === "studio"} className={mode === "studio" ? "active" : ""} onClick={() => setMode("studio")}>
          <Sparkles size={16} /><span><strong>Studio</strong><small>Desenho, formas, carimbos e tipografia</small></span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "precise"} className={mode === "precise" ? "active" : ""} onClick={() => setMode("precise")}>
          <ShieldCheck size={16} /><span><strong>Modo preciso</strong><small>Texto detectado, camadas e rascunhos</small></span>
        </button>
      </div>
      <div className="editor-mode-note">
        {mode === "studio"
          ? "Studio é ideal para criar, desenhar e anotar. O Modo preciso é carregado somente quando você entra nele, evitando atalhos e eventos do editor inativo."
          : "Modo preciso mantém correções de texto, camadas e rascunhos locais. Ao voltar ao Studio, a sessão visual aberta continua preservada."}
      </div>
      <div hidden={mode !== "studio"} aria-hidden={mode !== "studio"}><PdfEditorStudio /></div>
      {mode === "precise" ? <div><PdfEditorWorkspaceHardened /></div> : null}
    </section>
  );
}
