"use client";

import Link from "next/link";
import { FileText, Grid2X2, ImagePlus, PencilLine, Search, ShieldCheck, Signature, SlidersHorizontal, Type } from "lucide-react";

type EditorMode = "studio" | "precise";

function clickEditorButton(label: string, mode: EditorMode) {
  const normalized = label.toLocaleLowerCase("pt-BR");
  const scope = document.querySelector<HTMLElement>(`[data-editor-panel="${mode}"]`);
  if (!scope) return false;
  const buttons = Array.from(scope.querySelectorAll<HTMLButtonElement>(".studio-tools button,.editor-tools button,.studio-find-replace button,.studio-signature button"));
  const button = buttons.find((item) => item.textContent?.toLocaleLowerCase("pt-BR").includes(normalized));
  if (!button || button.disabled) return false;
  button.click();
  button.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return true;
}

export function EditorCommandBar({ mode }: { mode: EditorMode }) {
  const run = (label: string) => clickEditorButton(label, mode);
  return (
    <nav className="editor-command-bar" aria-label={`Atalhos do editor — ${mode === "studio" ? "Studio" : "Modo preciso"}`}>
      <div className="editor-command-group">
        <small>Editar</small>
        <button type="button" onClick={() => run("Selecionar")}><Grid2X2 size={15} />Selecionar</button>
        <button type="button" onClick={() => run("Texto")}><Type size={15} />Texto</button>
        <button type="button" onClick={() => run("Imagem")}><ImagePlus size={15} />Imagem</button>
        <button type="button" onClick={() => run("Assinar")}><Signature size={15} />Assinar</button>
      </div>
      <div className="editor-command-group">
        <small>Revisar</small>
        <button type="button" onClick={() => run("Destacar")}><PencilLine size={15} />Destacar</button>
        <button type="button" onClick={() => run("Redigir")}><ShieldCheck size={15} />Redigir</button>
        {mode === "studio" ? <button type="button" onClick={() => run("Localizar")}><Search size={15} />Localizar</button> : null}
        <Link href="/ferramentas/ocr-pdf"><FileText size={15} />OCR</Link>
      </div>
      <div className="editor-command-group">
        <small>Página</small>
        <Link href="/ferramentas/dimensionar-pdf"><SlidersHorizontal size={15} />Tamanho</Link>
        <Link href="/ferramentas/recortar-pdf"><Grid2X2 size={15} />Recortar</Link>
        <Link href="/ferramentas/girar-pdf"><Grid2X2 size={15} />Girar</Link>
        <Link href="/ferramentas/organizar-paginas"><Grid2X2 size={15} />Organizar</Link>
        <Link href="/ferramentas/numeracao-bates"><FileText size={15} />Bates</Link>
      </div>
      <div className="editor-command-group">
        <small>Interativo</small>
        <Link href="/ferramentas/links-pdf"><FileText size={15} />Links</Link>
        <Link href="/ferramentas/criar-formulario-pdf"><FileText size={15} />Formulário</Link>
        <Link href="/ferramentas/bookmarks-pdf"><FileText size={15} />Marcadores</Link>
      </div>
      <div className="editor-command-group">
        <small>Documento</small>
        <Link href="/ferramentas/preflight-pdf"><ShieldCheck size={15} />Preflight</Link>
        <Link href="/ferramentas/assinatura-digital-pdf"><Signature size={15} />Assinatura digital</Link>
        <Link href="/ferramentas/proteger-pdf"><ShieldCheck size={15} />Proteger</Link>
        <Link href="/ferramentas/compactar-pdf"><SlidersHorizontal size={15} />Compactar</Link>
        <Link href="/ferramentas/editar-metadados-pdf"><FileText size={15} />Metadados</Link>
      </div>
    </nav>
  );
}
