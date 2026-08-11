"use client";

import Link from "next/link";
import { FileText, Grid2X2, ImagePlus, PencilLine, ShieldCheck, Signature, SlidersHorizontal, Type } from "lucide-react";
import { useEffect } from "react";

type EditorMode = "studio" | "precise";
type StudioAction = "select" | "text" | "pen" | "highlight" | "line" | "arrow" | "rect" | "ellipse" | "redact" | "comment" | "stamp" | "signature" | "image";
const studioActionOrder: StudioAction[] = ["select", "text", "pen", "highlight", "line", "arrow", "rect", "ellipse", "redact", "comment", "stamp", "signature", "image"];

function installStudioActionIds() {
  const scope = document.querySelector<HTMLElement>('[data-editor-panel="studio"]');
  if (!scope) return;
  const buttons = Array.from(scope.querySelectorAll<HTMLButtonElement>(".studio-tools > button"));
  studioActionOrder.forEach((action, index) => { const button = buttons[index]; if (button) button.dataset.editorAction = action; });
}

function clickStudioAction(action: StudioAction) {
  const scope = document.querySelector<HTMLElement>('[data-editor-panel="studio"]');
  const button = scope?.querySelector<HTMLButtonElement>(`[data-editor-action="${action}"]`);
  if (!button || button.disabled) return false;
  button.click();
  button.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return true;
}

export function EditorCommandBar({ mode }: { mode: EditorMode }) {
  useEffect(() => {
    if (mode !== "studio") return;
    installStudioActionIds();
    const scope = document.querySelector<HTMLElement>('[data-editor-panel="studio"]');
    if (!scope) return;
    const observer = new MutationObserver(installStudioActionIds);
    observer.observe(scope, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [mode]);

  return (
    <nav className="editor-command-bar" aria-label={`Atalhos do editor — ${mode === "studio" ? "Studio" : "Modo preciso"}`}>
      {mode === "studio" ? <>
        <div className="editor-command-group"><small>Editar</small><button type="button" onClick={() => clickStudioAction("select")}><Grid2X2 size={15} />Selecionar</button><button type="button" onClick={() => clickStudioAction("text")}><Type size={15} />Texto</button><button type="button" onClick={() => clickStudioAction("image")}><ImagePlus size={15} />Imagem</button><button type="button" onClick={() => clickStudioAction("signature")}><Signature size={15} />Assinar</button></div>
        <div className="editor-command-group"><small>Revisar</small><button type="button" onClick={() => clickStudioAction("highlight")}><PencilLine size={15} />Destacar</button><button type="button" onClick={() => clickStudioAction("redact")}><ShieldCheck size={15} />Redigir</button><Link href="/ferramentas/ocr-pdf"><FileText size={15} />OCR</Link></div>
      </> : <div className="editor-command-group editor-command-hint"><small>Modo preciso</small><span>Use a barra do editor abaixo para texto detectado e camadas.</span></div>}
      <div className="editor-command-group"><small>Página</small><Link href="/ferramentas/dimensionar-pdf"><SlidersHorizontal size={15} />Tamanho</Link><Link href="/ferramentas/recortar-pdf"><Grid2X2 size={15} />Recortar</Link><Link href="/ferramentas/girar-pdf"><Grid2X2 size={15} />Girar</Link><Link href="/ferramentas/organizar-paginas"><Grid2X2 size={15} />Organizar</Link><Link href="/ferramentas/numeracao-bates"><FileText size={15} />Bates</Link></div>
      <div className="editor-command-group"><small>Interativo</small><Link href="/ferramentas/links-pdf"><FileText size={15} />Links</Link><Link href="/ferramentas/criar-formulario-pdf"><FileText size={15} />Formulário</Link><Link href="/ferramentas/bookmarks-pdf"><FileText size={15} />Marcadores</Link></div>
      <div className="editor-command-group"><small>Documento</small><Link href="/ferramentas/preflight-pdf"><ShieldCheck size={15} />Preflight</Link><Link href="/ferramentas/assinatura-digital-pdf"><Signature size={15} />Assinatura digital</Link><Link href="/ferramentas/proteger-pdf"><ShieldCheck size={15} />Proteger</Link><Link href="/ferramentas/compactar-pdf"><SlidersHorizontal size={15} />Compactar</Link><Link href="/ferramentas/editar-metadados-pdf"><FileText size={15} />Metadados</Link></div>
    </nav>
  );
}
