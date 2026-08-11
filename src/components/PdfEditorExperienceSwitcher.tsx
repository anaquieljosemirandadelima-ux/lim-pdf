"use client";

import dynamic from "next/dynamic";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const PdfEditorStudio = dynamic(() => import("@/components/PdfEditorStudio").then((module) => module.PdfEditorStudio), { loading: () => <div className="editor-mode-loading" role="status">Preparando o Studio…</div> });
const PdfEditorWorkspaceHardened = dynamic(() => import("@/components/PdfEditorWorkspaceHardened").then((module) => module.PdfEditorWorkspaceHardened), { loading: () => <div className="editor-mode-loading" role="status">Preparando o modo preciso…</div> });

type EditorMode = "studio" | "precise";

export function PdfEditorExperienceSwitcher() {
  const [mode, setMode] = useState<EditorMode>("studio");
  const [preciseMounted, setPreciseMounted] = useState(false);

  useEffect(() => {
    document.body.dataset.limpdfEditorMode = mode;
    return () => { delete document.body.dataset.limpdfEditorMode; };
  }, [mode]);

  function selectMode(next: EditorMode) {
    if (next === "precise") setPreciseMounted(true);
    setMode(next);
  }

  return <section className="editor-experience-switcher">
    <div className="editor-mode-tabs" role="tablist" aria-label="Modo de edição">
      <button type="button" role="tab" aria-selected={mode === "studio"} className={mode === "studio" ? "active" : ""} onClick={() => selectMode("studio")}><Sparkles size={16} /><span><strong>Studio</strong><small>Editar, desenhar, páginas, assinatura e revisão</small></span></button>
      <button type="button" role="tab" aria-selected={mode === "precise"} className={mode === "precise" ? "active" : ""} onClick={() => selectMode("precise")}><ShieldCheck size={16} /><span><strong>Modo preciso</strong><small>Texto detectado, alinhamento, camadas e rascunhos</small></span></button>
    </div>
    <div className="editor-mode-note">{mode === "studio" ? "Use o Studio para o trabalho visual e operações de página. O modo preciso fica disponível quando você precisa corrigir blocos detectados ou trabalhar com alinhamento e camadas." : "As duas sessões permanecem montadas depois do primeiro acesso. Voltar ao Studio não apaga o estado do modo preciso."}</div>
    <div hidden={mode !== "studio"} aria-hidden={mode !== "studio"}><PdfEditorStudio /></div>
    {preciseMounted ? <div hidden={mode !== "precise"} aria-hidden={mode !== "precise"}><PdfEditorWorkspaceHardened /></div> : null}
  </section>;
}
