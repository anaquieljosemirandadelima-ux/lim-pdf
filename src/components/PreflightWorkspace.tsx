"use client";

import { useRef, useState } from "react";
import { CheckCircle2, CircleOff, Download, FileText, ListChecks, LoaderCircle, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { OutputActions } from "@/components/OutputActions";
import { downloadBytes, humanSize, prepareOutput } from "@/lib/browser-files";
import { useLocalJobQueue } from "@/lib/use-local-job-queue";
import { formatFileSizeLimit, getFileSizeGuidance, isFileWithinLimit, isPdfFile, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";
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
  const { jobs, activeJob, enqueue, cancel, retry, clearFinished } = useLocalJobQueue();

  function selectFile(selected: File | null) {
    if (!selected) return;
    if (!isPdfFile(selected)) { setStatus({ type: "error", message: "Selecione um arquivo PDF." }); return; }
    if (!isFileWithinLimit(selected, MAX_LOCAL_PDF_BYTES)) { setStatus({ type: "error", message: `O PDF ultrapassa ${formatFileSizeLimit()}.` }); return; }
    setFile(selected); setFindings([]); setStatus({ type: "idle" });
  }

  function clearFile() {
    setFile(null); setFindings([]); setStatus({ type: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  function downloadReport() {
    if (!file || !findings.length) return;
    const lines = ["LIM PDF — relatório de preflight", `Arquivo: ${file.name}`, `Tamanho: ${humanSize(file.size)}`, `Gerado em: ${new Date().toLocaleString("pt-BR")}`, "", ...findings.map((finding) => `[${finding.severity.toUpperCase()}] ${finding.title}\n${finding.detail}`)];
    const filename = `${file.name.replace(/\.pdf$/i, "") || "documento"}-preflight.txt`;
    prepareOutput(new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" }), filename);
  }

  async function downloadSanitized() {
    if (!file) return;
    setStatus({ type: "processing", message: "Criando uma cópia sanitizada localmente…" });
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
      pdf.setTitle("");
      pdf.setAuthor("");
      pdf.setSubject("");
      pdf.setKeywords([]);
      try { pdf.getForm().flatten({ updateFieldAppearances: true }); } catch { /* PDFs sem formulário seguem normalmente. */ }
      downloadBytes(await pdf.save({ useObjectStreams: true }), `${file.name.replace(/\.pdf$/i, "") || "documento"}-sanitizado.pdf`);
      setStatus({ type: "success", message: "Cópia sanitizada criada. O PDF original não foi alterado." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível criar a cópia sanitizada." });
    }
  }

  async function analyze() {
    if (!file || activeJob) return;
    const job = enqueue(`Preflight: ${file.name}`, async (_signal, report) => {
      const next: Finding[] = [];
      const bytes = await file.arrayBuffer();
      report(10, "Lendo dimensões e estrutura…");
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

      report(45, "Verificando texto, anotações e links…");
      const source = await loadPdfJsDocument(bytes.slice(0));
      let pagesWithoutText = 0;
      let annotations = 0;
      let externalLinks = 0;
      try {
        for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
          const page = await source.getPage(pageNumber);
          const text = await page.getTextContent();
          if (!text.items.some((item) => "str" in item && item.str.trim().length > 0)) pagesWithoutText += 1;
          const annots = await page.getAnnotations();
          annotations += annots.length;
          externalLinks += annots.filter((annotation) => {
            const item = annotation as { url?: string; action?: string; subtype?: string };
            return Boolean(item.url || item.action) && item.subtype === "Link";
          }).length;
          page.cleanup();
          report(45 + Math.round((pageNumber / Math.max(1, source.numPages)) * 40), `Verificando página ${pageNumber} de ${source.numPages}…`);
        }
      } finally { await source.cleanup(); }

      next.push(pagesWithoutText ? { severity: "warn", title: "Páginas sem camada de texto", detail: `${pagesWithoutText} de ${pageSizes.length} página(s) não têm texto pesquisável. Se forem digitalizações, rode OCR.` } : { severity: "ok", title: "Texto pesquisável", detail: "Todas as páginas apresentam algum conteúdo textual detectável." });
      next.push(annotations ? { severity: "info", title: "Anotações presentes", detail: `${annotations} anotação(ões) foram encontradas. Confira comentários, links e marcações antes da versão final.` } : { severity: "ok", title: "Sem anotações detectadas", detail: "Nenhuma anotação foi identificada pelas páginas analisadas." });
      if (externalLinks) next.push({ severity: "warn", title: "Links externos detectados", detail: `${externalLinks} link(s) apontam para uma ação ou URL externa. Revise-os antes de partilhar ou arquivar o PDF.` });
      else next.push({ severity: "ok", title: "Sem links externos detectados", detail: "Não foram encontrados links externos nas anotações analisadas." });
      return next;
    });
    setStatus({ type: "processing", message: "Análise adicionada à fila local…" });
    try {
      const next = await job.promise;
      setFindings(next);
      setStatus({ type: "success", message: "Diagnóstico concluído. O arquivo não foi alterado." });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setFindings([]);
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível analisar o PDF." });
    }
  }

  return <section className="workspace preflight-workspace">
    <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0] || null); }}>
      <span className="drop-icon"><UploadCloud size={31} /></span><strong>Selecione o PDF para check-up</strong><span>O diagnóstico lê dimensões, texto, formulários, anotações e metadados sem modificar o arquivo.</span>
      <button className="primary-button" type="button" onClick={() => { if (inputRef.current) { inputRef.current.value = ""; inputRef.current.click(); } }}><FileText size={18} /> Escolher PDF</button>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => selectFile(event.target.files?.[0] || null)} />
      <small>Até {formatFileSizeLimit()} por arquivo · análise local</small>
    </div>
    {file ? <div className="selected-files"><div className="selected-file-row"><FileText size={17} /><span><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span><button type="button" aria-label="Remover arquivo" onClick={clearFile}><Trash2 size={15} /></button></div></div> : null}
    {file && getFileSizeGuidance(file).tier !== "standard" ? <div className="large-file-notice" role="status"><ShieldCheck size={16} /><span><strong>Diagnóstico de arquivo grande</strong><small>{getFileSizeGuidance(file).message} O preflight lê a estrutura localmente e não altera o documento.</small></span></div> : null}
    <button className="process-button" type="button" disabled={!file || Boolean(activeJob)} onClick={() => void analyze()}>{activeJob ? <><LoaderCircle className="spin" size={18} /> {activeJob.message}</> : <><ListChecks size={18} /> Executar preflight</>}</button>
    {status.type === "processing" ? <div className="status-message status-processing"><LoaderCircle className="spin" size={18} /><span>{status.message}</span></div> : null}
    {status.type === "success" ? <div className="status-message status-success"><CheckCircle2 size={18} /><span>{status.message}</span></div> : null}
    {status.type === "error" ? <div className="status-message status-error"><span>{status.message}</span></div> : null}
        {findings.length ? <><OutputActions /><div className="preflight-report-actions"><button className="secondary-button" type="button" onClick={downloadReport}><Download size={16} /> Preparar relatório</button><button className="secondary-button" type="button" onClick={() => void downloadSanitized()}><ShieldCheck size={16} /> Criar cópia sanitizada</button></div><div className="preflight-results">
{findings.map((finding) => <article className={`preflight-${finding.severity}`} key={finding.title}>{finding.severity === "ok" ? <CheckCircle2 size={19} /> : finding.severity === "warn" ? <CircleOff size={19} /> : <ShieldCheck size={19} />}<div><strong>{finding.title}</strong><p>{finding.detail}</p></div></article>)}</div></> : null}
    {jobs.length ? <div className="local-job-queue" aria-label="Fila local do preflight"><div><strong>Fila local</strong><button className="text-button" type="button" onClick={clearFinished}>Limpar concluídos</button></div>{jobs.map((job) => <div className="local-job-row" key={job.id}><span><strong>{job.label}</strong><small>{job.message}</small></span><span>{job.status === "running" || job.status === "queued" ? `${job.progress}%` : job.status === "success" ? "Concluído" : job.status === "error" ? "Falhou" : "Cancelado"}</span>{job.status === "running" || job.status === "queued" ? <button className="icon-button" type="button" aria-label="Cancelar análise" onClick={() => cancel(job.id)}><span aria-hidden="true">×</span></button> : job.status === "error" ? <button className="text-button" type="button" onClick={() => void retry(job.id)}>Tentar novamente</button> : null}</div>)}</div> : null}
  </section>;
}
