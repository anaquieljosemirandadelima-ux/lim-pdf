"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { PdfEditorStudio } from "@/components/PdfEditorStudio";
import { PdfEditorWorkspaceHardened } from "@/components/PdfEditorWorkspaceHardened";

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
        {mode === "studio" ? "Studio é ideal para criar, desenhar e anotar. O Modo preciso fica disponível para correções de texto existente e mantém sua sessão separada." : "Modo preciso preserva substituição sanitizada de texto, seleção múltipla, camadas e rascunhos. Voltar ao Studio não apaga a sessão dele."}
      </div>
      <div hidden={mode !== "studio"} aria-hidden={mode !== "studio"}><PdfEditorStudio /></div>
      <div hidden={mode !== "precise"} aria-hidden={mode !== "precise"}><PdfEditorWorkspaceHardened /></div>
    </section>
  );
}
