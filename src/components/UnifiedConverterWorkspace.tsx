"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, FileOutput, FileText, Image, LoaderCircle, Repeat2, Trash2, UploadCloud } from "lucide-react";
import { AdvancedToolWorkspace } from "@/components/AdvancedToolWorkspace";
import { MemorySafePdfWorkspace } from "@/components/MemorySafePdfWorkspace";
import { PdfToolWorkspace } from "@/components/PdfToolWorkspace";
import { allToolBySlug, type AllToolSlug } from "@/lib/all-tools";
import { humanSize } from "@/lib/browser-files";
import { clearTemporaryFiles } from "@/lib/temporary-cache";
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
const childCacheKeys = ["tool:pdf-para-jpg", "tool:pdf-para-png", "tool:extrair-texto-pdf"] as const;

function isMemorySafe(slug: ConverterOutputSlug) { return slug === "pdf-para-jpg" || slug === "pdf-para-png"; }
function normalizePdfFile(file: File) {
  if (file.type === "application/pdf") return file;
  return new File([file], file.name, { type: "application/pdf", lastModified: file.lastModified });
}

export function UnifiedConverterWorkspace({ initialOutput = "pdf-para-word" }: { initialOutput?: ConverterOutputSlug }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [output, setOutput] = useState<ConverterOutputSlug>(initialOutput);
  const [preparing, setPreparing] = useState(false);
  const [processingLocked, setProcessingLocked] = useState(false);
  const tool = useMemo(() => allToolBySlug.get(output as AllToolSlug), [output]);

  async function selectFile(selected: File | null) {
    if (!selected || processingLocked || preparing) return;
    if (!selected.name.toLowerCase().endsWith(".pdf") && selected.type !== "application/pdf") return;
    if (selected.size > 60 * 1024 * 1024) return;
    setPreparing(true);
    try {
      // O conversor é a fonte da verdade do arquivo. Limpa snapshots dos workspaces
      // filhos antes de montá-los para impedir que uma sessão antiga substitua o PDF atual.
      await Promise.all(childCacheKeys.map((key) => clearTemporaryFiles(key)));
      setFile(normalizePdfFile(selected));
    } finally {
      setPreparing(false);
    }
  }

  function clearFile() {
    if (processingLocked) return;
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function openPicker() {
    if (!inputRef.current || processingLocked || preparing) return;
    inputRef.current.value = "";
    inputRef.current.click();
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

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>("button.process-button");
      if (button && !button.disabled) setProcessingLocked(true);
    };
    const observer = new MutationObserver(() => {
      if (!processingLocked) return;
      if (host.querySelector(".status-message.success,.status-message.error")) setProcessingLocked(false);
    });
    host.addEventListener("click", onClick, true);
    observer.observe(host, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => { host.removeEventListener("click", onClick, true); observer.disconnect(); };
  }, [file, output, processingLocked]);

  if (!tool) return null;

  return <section className={`workspace unified-converter ${processingLocked ? "is-processing" : ""}`}>
    <div className="unified-converter-upload" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!processingLocked) void selectFile(event.dataTransfer.files[0] || null); }}>
      {!file ? <><span>{preparing ? <LoaderCircle className="spin" size={30} /> : <UploadCloud size={30} />}</span><div><strong>{preparing ? "Preparando arquivo…" : "Escolha o PDF uma vez"}</strong><small>Depois você pode trocar o formato de saída sem voltar ao catálogo.</small></div><button className="primary-button" type="button" disabled={preparing} onClick={openPicker}><FileText size={18} /> Selecionar PDF</button></> : <><span><FileText size={27} /></span><div className="unified-file-copy"><strong>{file.name}</strong><small>{humanSize(file.size)} · escolha abaixo como deseja converter</small></div><button className="secondary-button" type="button" disabled={processingLocked} onClick={clearFile}><Trash2 size={15} /> Trocar arquivo</button></>}
      <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onChange={(event) => void selectFile(event.target.files?.[0] || null)} />
    </div>

    <div className="converter-format-panel">
      <div><span className="converter-format-kicker"><Repeat2 size={15} /> Converter para</span><strong>{outputOptions.find((item) => item.slug === output)?.label}</strong><small>{processingLocked ? "Aguarde a conversão atual terminar." : "Você pode mudar o formato mesmo depois de subir o arquivo."}</small></div>
      <div className="converter-format-options" role="list" aria-label="Formato de saída">{outputOptions.map((option) => { const Icon = option.icon; return <button key={option.slug} type="button" disabled={processingLocked} className={output === option.slug ? "active" : ""} onClick={() => setOutput(option.slug)}><Icon size={18} /><span><strong>{option.label}</strong><small>{option.detail}</small></span></button>; })}</div>
    </div>

    {file ? <div className="unified-converter-host" ref={hostRef}>{output === "pdf-para-word" || output === "pdf-para-excel" ? <AdvancedToolWorkspace tool={tool} /> : isMemorySafe(output) ? <MemorySafePdfWorkspace tool={tool as ToolDefinition} /> : <PdfToolWorkspace tool={tool as ToolDefinition} />}</div> : <div className="converter-empty-state"><FileOutput size={25} /><strong>O botão de conversão aparece aqui após selecionar o PDF.</strong><p>O formato escolhido fica visível no mesmo bloco para você não precisar procurar a ação mais abaixo.</p></div>}

    <div className="converter-other-directions"><span>Quer converter para PDF?</span><Link href="/ferramentas/word-para-pdf">Word → PDF <ArrowRight size={13} /></Link><Link href="/ferramentas/excel-para-pdf">Excel → PDF <ArrowRight size={13} /></Link><Link href="/ferramentas/imagens-para-pdf">Imagens → PDF <ArrowRight size={13} /></Link></div>
  </section>;
}
