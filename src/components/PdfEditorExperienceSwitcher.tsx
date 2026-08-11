"use client";

import dynamic from "next/dynamic";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { EditorCommandBar } from "@/components/EditorCommandBar";

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
          <Sparkles size={16} /><span><strong>Studio</strong><small>Visual, rápido e direto</small></span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "precise"} className={mode === "precise" ? "active" : ""} onClick={() => setMode("precise")}>
          <ShieldCheck size={16} /><span><strong>Modo preciso</strong><small>Texto detectado, camadas e sanitização</small></span>
        </button>
      </div>
      <div className="editor-mode-note">
        {mode === "studio"
          ? "Use a faixa abaixo para ir direto ao que precisa. As opções de página abrem a ferramenta certa sem procurar no catálogo."
          : "Use este modo quando precisar substituir texto detectado, trabalhar com camadas e aplicar correções mais controladas."}
      </div>
      <EditorCommandBar />
      <div hidden={mode !== "studio"} aria-hidden={mode !== "studio"}><PdfEditorStudio /></div>
      {mode === "precise" ? <div><PdfEditorWorkspaceHardened /></div> : null}
    </section>
  );
}
