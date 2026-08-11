"use client";

import { useRef, useState } from "react";
import { CheckCircle2, CircleOff, FileText, ListChecks, LoaderCircle, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { humanSize } from "@/lib/browser-files";
import { loadPdfJsDocument } from "@/lib/pdf-render";

type Severity = "ok" | "warn" | "info";
type Finding = { severity: Severity; title: string; detail: string };
type Status = { type: "idle" | "processing" | "error" | "success"; message?: string };

function mm(points: number) { return Math.round(points * 25.4 / 72); }
function sizeKey(width: number, height: number) { return `${Math.round(width)}x${Math.round(height)}`; }

export function PreflightWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [findings, setFindings] = useState<Finding[]>([]);

  function selectFile(selected: File | null) {
    if (!selected) return;
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) { setStatus({ type: "error", message: "Selecione um arquivo PDF." }); return; }
    if (selected.size > 80 * 1024 * 1024) { setStatus({ type: "error", message: "O PDF ultrapassa 80 MB." }); return; }
    setFile(selected); setFindings([]); setStatus({ type: "idle" });
  }

  function clearFile() {
    setFile(null); setFindings([]); setStatus({ type: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyze() {
    if (!file || status.type === "processing") return;
    setStatus({ type: "processing", message: "Analisando páginas e estrutura…" });
    const next: Finding[] = [];
    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      const pageSizes = pdf.getPages().map((page) => ({ width: page.getWidth(), height: page.getHeight() }));
      const uniqueSizes = new Map<string, { width: number; height: number; count: number }>();
      for (const size of pageSizes) {
        const key = sizeKey(size.width, size.height);
        const entry = uniqueSizes.get(key);
        if (entry) entry.count += 1; else uniqueSizes.set(key, { ...size, count: 1 });
      }
      if (uniqueSizes.size > 1) next.push({ severity: "warn", title: "Tamanhos de página mistos", detail: `${uniqueSizes.size} dimensões diferentes foram encontradas: ${[...uniqueSizes.values()].map((item) => `${mm(item.width)}×${mm(item.height)} mm (${item.count})`).join("; ")}.` });
      else if (pageSizes[0]) next.push({ severity: "ok", title: "Dimensões consistentes", detail: `Todas as ${pageSizes.length} página(s) usam aproximadamente ${mm(pageSizes[0].width)}×${mm(pageSizes[0].height)} mm.` });

      let fields = 0;
      try { fields = pdf.getForm().getFields().length; } catch { fields = 0; }
      next.push(fields ? { severity: "info", title: "Formulário interativo", detail: `${fields} campo(s) AcroForm encontrado(s). Se a saída final não deve ser editável, considere achatar o formulário.` } : { severity: "ok", title: "Sem campos de formulário", detail: "Nenhum campo AcroForm foi encontrado." });

      const metadata = [pdf.getTitle(), pdf.getAuthor(), pdf.getSubject(), pdf.getKeywords()].filter(Boolean);
      next.push(metadata.length ? { severity: "info", title: "Metadados presentes", detail: "Título, autor, assunto ou palavras-chave estão preenchidos. Revise antes de distribuir um documento sensível." } : { severity: "ok", title: "Metadados básicos vazios", detail: "Não foram encontrados título, autor, assunto ou palavras-chave nos campos básicos." });

      const source = await loadPdfJsDocument(bytes.slice(0));
      let pagesWithoutText = 0;
      let annotations = 0;
      try {
        for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
          const page = await source.getPage(pageNumber);
          const text = await page.getTextContent();
          if (!text.items.some((item) => "str" in item && item.str.trim().length > 0)) pagesWithoutText += 1;
          const annots = await page.getAnnotations();
          annotations += annots.length;
          page.cleanup();
        }
      } finally { await source.cleanup(); }

      next.push(pagesWithoutText ? { severity: "warn", title: "Páginas sem camada de texto", detail: `${pagesWithoutText} de ${pageSizes.length} página(s) não têm texto pesquisável. Se forem digitalizações, rode OCR.` } : { severity: "ok", title: "Texto pesquisável", detail: "Todas as páginas apresentam algum conteúdo textual detectável." });
      next.push(annotations ? { severity: "info", title: "Anotações presentes", detail: `${annotations} anotação(ões) foram encontradas. Confira comentários, links e marcações antes da versão final.` } : { severity: "ok", title: "Sem anotações detectadas", detail: "Nenhuma anotação foi identificada pelas páginas analisadas." });

      setFindings(next); setStatus({ type: "success", message: "Diagnóstico concluído. O arquivo não foi alterado." });
    } catch (error) {
      setFindings([]); setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível analisar o PDF." });
    }
  }

  return <section className="workspace preflight-workspace">
    <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0] || null); }}>
      <span className="drop-icon"><UploadCloud size={31} /></span><strong>Selecione o PDF para check-up</strong><span>O diagnóstico lê dimensões, texto, formulários, anotações e metadados sem modificar o arquivo.</span>
      <button className="primary-button" type="button" onClick={() => { if (inputRef.current) { inputRef.current.value = ""; inputRef.current.click(); } }}><FileText size={18} /> Escolher PDF</button>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => selectFile(event.target.files?.[0] || null)} />
    </div>
    {file ? <div className="selected-files"><div className="selected-file-row"><FileText size={17} /><span><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span><button type="button" aria-label="Remover arquivo" onClick={clearFile}><Trash2 size={15} /></button></div></div> : null}
    <button className="process-button" type="button" disabled={!file || status.type === "processing"} onClick={() => void analyze()}>{status.type === "processing" ? <><LoaderCircle className="spin" size={18} /> Analisando…</> : <><ListChecks size={18} /> Executar preflight</>}</button>
    {status.type === "success" ? <div className="status-message success"><CheckCircle2 size={18} /><span>{status.message}</span></div> : null}
    {status.type === "error" ? <div className="status-message error"><span>{status.message}</span></div> : null}
    {findings.length ? <div className="preflight-results">{findings.map((finding) => <article className={`preflight-${finding.severity}`} key={finding.title}>{finding.severity === "ok" ? <CheckCircle2 size={19} /> : finding.severity === "warn" ? <CircleOff size={19} /> : <ShieldCheck size={19} />}<div><strong>{finding.title}</strong><p>{finding.detail}</p></div></article>)}</div> : null}
  </section>;
}
