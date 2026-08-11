"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, FileOutput, FileText, Image, Repeat2, Trash2, UploadCloud } from "lucide-react";
import { AdvancedToolWorkspace } from "@/components/AdvancedToolWorkspace";
import { MemorySafePdfWorkspace } from "@/components/MemorySafePdfWorkspace";
import { PdfToolWorkspace } from "@/components/PdfToolWorkspace";
import { allToolBySlug, type AllToolSlug } from "@/lib/all-tools";
import { humanSize } from "@/lib/browser-files";
import type { ToolDefinition } from "@/lib/tools";

export const converterOutputSlugs = ["pdf-para-word", "pdf-para-excel", "pdf-para-jpg", "pdf-para-png", "extrair-texto-pdf"] as const;
export type ConverterOutputSlug = typeof converterOutputSlugs[number];

const outputOptions: Array<{ slug: ConverterOutputSlug; label: string; detail: string; icon: typeof FileOutput }> = [
  { slug: "pdf-para-word", label: "Word", detail: ".docx editável", icon: FileText },
  { slug: "pdf-para-excel", label: "Excel", detail: ".xlsx com dados", icon: FileOutput },
  { slug: "pdf-para-jpg", label: "JPG", detail: "imagens compactas", icon: Image },
  { slug: "pdf-para-png", label: "PNG", detail: "imagens nítidas", icon: Image },
  { slug: "extrair-texto-pdf", label: "Texto", detail: "conteúdo extraído", icon: FileText },
];

function isMemorySafe(slug: ConverterOutputSlug) {
  return slug === "pdf-para-jpg" || slug === "pdf-para-png";
}

export function UnifiedConverterWorkspace({ initialOutput = "pdf-para-word" }: { initialOutput?: ConverterOutputSlug }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [output, setOutput] = useState<ConverterOutputSlug>(initialOutput);
  const tool = useMemo(() => allToolBySlug.get(output as AllToolSlug), [output]);

  function selectFile(selected: File | null) {
    if (!selected) return;
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) return;
    if (selected.size > 60 * 1024 * 1024) return;
    setFile(selected);
  }

  useEffect(() => {
    if (!file || !hostRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const target = hostRef.current?.querySelector<HTMLInputElement>('input[type="file"]');
      if (!target) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      target.files = transfer.files;
      target.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [file, output]);

  if (!tool) return null;

  return <section className="workspace unified-converter">
    <div className="unified-converter-upload" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0] || null); }}>
      {!file ? <><span><UploadCloud size={30} /></span><div><strong>Escolha o PDF uma vez</strong><small>Depois você pode trocar o formato de saída sem voltar ao catálogo.</small></div><button className="primary-button" type="button" onClick={() => inputRef.current?.click()}><FileText size={18} /> Selecionar PDF</button></> : <><span><FileText size={27} /></span><div className="unified-file-copy"><strong>{file.name}</strong><small>{humanSize(file.size)} · escolha abaixo como deseja converter</small></div><button className="secondary-button" type="button" onClick={() => { setFile(null); }}><Trash2 size={15} /> Trocar arquivo</button></>}
      <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onChange={(event) => selectFile(event.target.files?.[0] || null)} />
    </div>

    <div className="converter-format-panel">
      <div><span className="converter-format-kicker"><Repeat2 size={15} /> Converter para</span><strong>{outputOptions.find((item) => item.slug === output)?.label}</strong><small>Você pode mudar o formato mesmo depois de subir o arquivo.</small></div>
      <div className="converter-format-options" role="list" aria-label="Formato de saída">
        {outputOptions.map((option) => { const Icon = option.icon; return <button key={option.slug} type="button" className={output === option.slug ? "active" : ""} onClick={() => setOutput(option.slug)}><Icon size={18} /><span><strong>{option.label}</strong><small>{option.detail}</small></span></button>; })}
      </div>
    </div>

    {file ? <div className="unified-converter-host" ref={hostRef}>
      {output === "pdf-para-word" || output === "pdf-para-excel" ? <AdvancedToolWorkspace tool={tool} /> : isMemorySafe(output) ? <MemorySafePdfWorkspace tool={tool as ToolDefinition} /> : <PdfToolWorkspace tool={tool as ToolDefinition} />}
    </div> : <div className="converter-empty-state"><FileOutput size={25} /><strong>O botão de conversão aparece aqui após selecionar o PDF.</strong><p>O formato escolhido fica visível no mesmo bloco para você não precisar procurar a ação mais abaixo.</p></div>}

    <div className="converter-other-directions"><span>Quer converter para PDF?</span><Link href="/ferramentas/word-para-pdf">Word → PDF <ArrowRight size={13} /></Link><Link href="/ferramentas/excel-para-pdf">Excel → PDF <ArrowRight size={13} /></Link><Link href="/ferramentas/imagens-para-pdf">Imagens → PDF <ArrowRight size={13} /></Link></div>
  </section>;
}
