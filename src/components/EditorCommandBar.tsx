"use client";

import Link from "next/link";
import { FileText, Grid2X2, ImagePlus, PencilLine, Search, ShieldCheck, Signature, SlidersHorizontal, Type } from "lucide-react";

function clickEditorButton(label: string) {
  const normalized = label.toLocaleLowerCase("pt-BR");
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".studio-tools button,.editor-tools button,.studio-find-replace button,.studio-signature button"));
  const button = buttons.find((item) => item.textContent?.toLocaleLowerCase("pt-BR").includes(normalized));
  if (!button || button.disabled) return false;
  button.click();
  button.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return true;
}

export function EditorCommandBar() {
  return (
    <nav className="editor-command-bar" aria-label="Atalhos organizados do editor">
      <div className="editor-command-group">
        <small>Editar</small>
        <button type="button" onClick={() => clickEditorButton("Selecionar")}><Grid2X2 size={15} />Selecionar</button>
        <button type="button" onClick={() => clickEditorButton("Texto")}><Type size={15} />Texto</button>
        <button type="button" onClick={() => clickEditorButton("Imagem")}><ImagePlus size={15} />Imagem</button>
        <button type="button" onClick={() => clickEditorButton("Assinar")}><Signature size={15} />Assinar</button>
      </div>
      <div className="editor-command-group">
        <small>Revisar</small>
        <button type="button" onClick={() => clickEditorButton("Destacar")}><PencilLine size={15} />Destacar</button>
        <button type="button" onClick={() => clickEditorButton("Redigir")}><ShieldCheck size={15} />Redigir</button>
        <button type="button" onClick={() => clickEditorButton("Localizar")}><Search size={15} />Localizar</button>
        <Link href="/ferramentas/ocr-pdf"><FileText size={15} />OCR</Link>
      </div>
      <div className="editor-command-group">
        <small>Página</small>
        <Link href="/ferramentas/dimensionar-pdf"><SlidersHorizontal size={15} />Tamanho</Link>
        <Link href="/ferramentas/recortar-pdf"><Grid2X2 size={15} />Recortar</Link>
        <Link href="/ferramentas/girar-pdf"><Grid2X2 size={15} />Girar</Link>
        <Link href="/ferramentas/organizar-paginas"><Grid2X2 size={15} />Organizar</Link>
      </div>
      <div className="editor-command-group">
        <small>Documento</small>
        <Link href="/ferramentas/proteger-pdf"><ShieldCheck size={15} />Proteger</Link>
        <Link href="/ferramentas/compactar-pdf"><SlidersHorizontal size={15} />Compactar</Link>
        <Link href="/ferramentas/remover-metadados"><FileText size={15} />Metadados</Link>
      </div>
    </nav>
  );
}
