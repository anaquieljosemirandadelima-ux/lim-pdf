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
        {mode === "studio" ? "Studio é ideal para criar e anotar. Para correções finas em texto já existente, use o Modo preciso." : "Modo preciso preserva o editor endurecido com substituição sanitizada de texto e rascunho local."}
      </div>
      {mode === "studio" ? <PdfEditorStudio /> : <PdfEditorWorkspaceHardened />}
    </section>
  );
}
