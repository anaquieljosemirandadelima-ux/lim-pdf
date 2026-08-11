"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileText, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";
import { downloadBlob, humanSize } from "@/lib/browser-files";
import { loadPdfJsDocument } from "@/lib/pdf-render";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
type Status = { type: "idle" | "processing" | "ready" | "error"; message?: string };
type Report = {
  filename: string; bytes: number; pages: number; pageSizes: { width: number; height: number; count: number; label: string }[];
  mixedSizes: boolean; portrait: number; landscape: number; rotated: number; pagesWithText: number; pagesWithoutText: number;
  formFields: number; annotations: number; title: string; author: string; subject: string; keywords: string[];
  recommendations: string[]; generatedAt: string;
};

function mm(points: number) { return Math.round(points * 25.4 / 72 * 10) / 10; }
function sizeLabel(width: number, height: number) {
  const w = mm(Math.min(width, height)); const h = mm(Math.max(width, height));
  if (Math.abs(w - 210) < 3 && Math.abs(h - 297) < 3) return "A4";
  if (Math.abs(w - 297) < 4 && Math.abs(h - 420) < 4) return "A3";
  if (Math.abs(w - 148) < 3 && Math.abs(h - 210) < 3) return "A5";
  if (Math.abs(w - 215.9) < 3 && Math.abs(h - 279.4) < 3) return "Carta";
  if (Math.abs(w - 215.9) < 3 && Math.abs(h - 355.6) < 3) return "Legal";
  return `${w} × ${h} mm`;
}

export function PreflightWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [report, setReport] = useState<Report | null>(null);

  function select(selected: File | null) {
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) return setStatus({ type: "error", message: "O PDF ultrapassa 100 MB." });
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) return setStatus({ type: "error", message: "Selecione um arquivo PDF." });
    setFile(selected); setReport(null); setStatus({ type: "idle" });
  }

  async function inspect() {
    if (!file || status.type === "processing") return;
    setStatus({ type: "processing", message: "Analisando páginas, texto, formulários e anotações…" });
    try {
      const bytes = await file.arrayBuffer();
      const pdfLib = await import("pdf-lib");
      const pdf = await pdfLib.PDFDocument.load(bytes.slice(0), { updateMetadata: false });
      const pages = pdf.getPages();
      const sizeMap = new Map<string, { width: number; height: number; count: number; label: string }>();
      let portrait = 0; let landscape = 0; let rotated = 0; let annotations = 0;
      for (const page of pages) {
        const { width, height } = page.getSize(); const key = `${Math.round(width * 10)}:${Math.round(height * 10)}`;
        const current = sizeMap.get(key); if (current) current.count += 1; else sizeMap.set(key, { width: mm(width), height: mm(height), count: 1, label: sizeLabel(width, height) });
        if (width <= height) portrait += 1; else landscape += 1;
        if (((page.getRotation().angle % 360) + 360) % 360) rotated += 1;
        try {
          const annots = page.node.lookup(pdfLib.PDFName.of("Annots"));
          if (annots instanceof pdfLib.PDFArray) annotations += annots.size();
        } catch { /* no-op */ }
      }
      let formFields = 0;
      try { formFields = pdf.getForm().getFields().length; } catch { formFields = 0; }

      const pdfJs = await loadPdfJsDocument(bytes.slice(0));
      let pagesWithText = 0;
      try {
        for (let pageNumber = 1; pageNumber <= pdfJs.numPages; pageNumber += 1) {
          const page = await pdfJs.getPage(pageNumber);
          try { const content = await page.getTextContent(); if (content.items.some((item) => "str" in item && Boolean(item.str.trim()))) pagesWithText += 1; } finally { page.cleanup(); }
        }
      } finally { await pdfJs.cleanup(); }
      const pagesWithoutText = pages.length - pagesWithText;
      const pageSizes = [...sizeMap.values()];
      const recommendations: string[] = [];
      if (pagesWithoutText) recommendations.push(`${pagesWithoutText} página(s) sem texto pesquisável: considere executar OCR.`);
      if (pageSizes.length > 1) recommendations.push("O documento mistura tamanhos de página: normalize as dimensões se o destino for impressão ou arquivamento uniforme.");
      if (rotated) recommendations.push(`${rotated} página(s) possuem rotação estrutural: revise a orientação antes da entrega.`);
      if (formFields) recommendations.push(`${formFields} campo(s) de formulário continuam editáveis: achate o formulário quando precisar de uma versão final imutável.`);
      if (annotations) recommendations.push(`${annotations} anotação(ões) detectada(s): revise comentários, links e destaques antes de distribuir.`);
      if (!pdf.getTitle() && !pdf.getAuthor()) recommendations.push("Título e autor estão vazios: preencher metadados pode melhorar organização e arquivamento interno.");
      if (!recommendations.length) recommendations.push("Nenhum alerta básico detectado. Ainda assim, revise visualmente o PDF antes da distribuição.");
      const next: Report = {
        filename: file.name, bytes: file.size, pages: pages.length, pageSizes, mixedSizes: pageSizes.length > 1, portrait, landscape, rotated, pagesWithText, pagesWithoutText,
        formFields, annotations, title: pdf.getTitle() || "", author: pdf.getAuthor() || "", subject: pdf.getSubject() || "", keywords: pdf.getKeywords() ? pdf.getKeywords()!.split(/[,;]+/).map((item) => item.trim()).filter(Boolean) : [], recommendations, generatedAt: new Date().toISOString(),
      };
      setReport(next); setStatus({ type: "ready", message: "Diagnóstico concluído." });
    } catch (error) { setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível analisar este PDF." }); }
  }

  function downloadReport() {
    if (!report) return;
    downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" }), `${report.filename.replace(/\.pdf$/i, "")}-preflight-lim-pdf.json`);
  }

  return <section className="workspace preflight-workspace">
    {!file ? <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); select(event.dataTransfer.files[0] || null); }}><span className="drop-icon"><ClipboardCheck size={31} /></span><strong>Faça um check-up do PDF antes de enviar</strong><span>Verifique dimensões, orientação, texto pesquisável, formulários, anotações e metadados.</span><button className="primary-button large-button" type="button" onClick={() => inputRef.current?.click()}><UploadCloud size={18} /> Selecionar PDF</button><input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onChange={(event) => select(event.target.files?.[0] || null)} /><small>Diagnóstico local · nenhum documento é enviado</small></div> : <>
      <div className="selected-files"><div className="selected-file-row"><FileText size={18} /><span><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span><button type="button" onClick={() => { setFile(null); setReport(null); }}>×</button></div></div>
      {!report ? <div className="sticky-tool-action"><div><strong>Preflight LIM PDF</strong><small>Um diagnóstico objetivo antes da publicação, impressão ou arquivamento.</small></div><button className="process-button" type="button" disabled={status.type === "processing"} onClick={() => void inspect()}>{status.type === "processing" ? <><LoaderCircle className="spin" size={18} /> Analisando…</> : <><ClipboardCheck size={18} /> Analisar PDF</>}</button></div> : null}
    </>}
    {status.type === "error" ? <div className="status-message error"><span>{status.message}</span></div> : null}
    {report ? <div className="preflight-report">
      <header><div><CheckCircle2 size={22} /><span><strong>Diagnóstico concluído</strong><small>{report.pages} páginas · {humanSize(report.bytes)}</small></span></div><button className="secondary-button" type="button" onClick={downloadReport}><Download size={16} /> Baixar relatório JSON</button></header>
      <div className="preflight-metrics"><article><strong>{report.pageSizes.length}</strong><span>tamanho(s) de página</span></article><article><strong>{report.pagesWithText}/{report.pages}</strong><span>páginas com texto</span></article><article><strong>{report.formFields}</strong><span>campos de formulário</span></article><article><strong>{report.annotations}</strong><span>anotações</span></article></div>
      <section><h3>Dimensões</h3><div className="preflight-size-list">{report.pageSizes.map((size) => <span key={`${size.width}-${size.height}`}><b>{size.label}</b>{size.width} × {size.height} mm · {size.count} pág.</span>)}</div><p>{report.portrait} retrato · {report.landscape} paisagem · {report.rotated} com rotação estrutural.</p></section>
      <section><h3>Metadados</h3><p>Título: <b>{report.title || "não informado"}</b> · Autor: <b>{report.author || "não informado"}</b>{report.subject ? ` · Assunto: ${report.subject}` : ""}</p></section>
      <section><h3>Recomendações</h3>{report.recommendations.map((item) => <div className="preflight-recommendation" key={item}><AlertTriangle size={16} /><span>{item}</span></div>)}</section>
      <div className="pro-info-card secure"><ShieldCheck size={17} /><span><strong>O que este diagnóstico não promete</strong><small>Ele não substitui validação normativa PDF/A, verificação jurídica de assinatura ou preflight gráfico especializado de uma gráfica.</small></span></div>
    </div> : null}
  </section>;
}
