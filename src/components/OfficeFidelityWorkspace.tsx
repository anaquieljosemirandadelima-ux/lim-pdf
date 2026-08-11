"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, FileText, LoaderCircle, Presentation, ShieldCheck, UploadCloud } from "lucide-react";
import { downloadBlob, downloadBytes, humanSize } from "@/lib/browser-files";
import { docxToPdfFidelity, pdfToDocxFidelity, pdfToXlsxFidelity, xlsxToPdfFidelity } from "@/lib/office-fidelity-engines";
import type { AnyToolDefinition } from "@/lib/all-tools";

const MAX_FILE_SIZE = 80 * 1024 * 1024;
type OfficeSlug = "pdf-para-word" | "pdf-para-excel" | "word-para-pdf" | "excel-para-pdf";
type Status = { type: "idle" | "processing" | "success" | "error"; message?: string; progress?: number };

function inputKind(slug: OfficeSlug) {
  if (slug === "word-para-pdf") return { accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "DOCX", icon: FileText };
  if (slug === "excel-para-pdf") return { accept: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "XLSX", icon: FileSpreadsheet };
  return { accept: "application/pdf,.pdf", label: "PDF", icon: FileText };
}

function outputLabel(slug: OfficeSlug) {
  if (slug === "pdf-para-word") return "DOCX";
  if (slug === "pdf-para-excel") return "XLSX";
  return "PDF";
}

export function OfficeFidelityWorkspace({ tool }: { tool: AnyToolDefinition }) {
  const slug = tool.slug as OfficeSlug;
  const input = useMemo(() => inputKind(slug), [slug]);
  const InputIcon = input.icon;
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [wordMode, setWordMode] = useState<"editable" | "visual">("editable");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [report, setReport] = useState<string[]>([]);

  function select(selected: File | null) {
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) { setStatus({ type: "error", message: "O arquivo ultrapassa 80 MB." }); return; }
    const name = selected.name.toLowerCase();
    const valid = slug.startsWith("pdf-para-") ? (selected.type === "application/pdf" || name.endsWith(".pdf")) : slug === "word-para-pdf" ? name.endsWith(".docx") : name.endsWith(".xlsx");
    if (!valid) { setStatus({ type: "error", message: `Selecione um arquivo ${input.label}.` }); return; }
    setFile(selected); setReport([]); setStatus({ type: "idle" });
  }

  function progress(message: string, percent?: number) { setStatus({ type: "processing", message, progress: percent }); }

  async function process() {
    if (!file || status.type === "processing") return;
    setReport([]); progress("Analisando estrutura do documento…", 2);
    try {
      if (slug === "pdf-para-word") {
        const result = await pdfToDocxFidelity(file, wordMode, progress);
        downloadBlob(result.blob, result.filename); setReport(result.report);
      } else if (slug === "pdf-para-excel") {
        const result = await pdfToXlsxFidelity(file, progress);
        downloadBlob(result.blob, result.filename); setReport(result.report);
      } else if (slug === "word-para-pdf") {
        const result = await docxToPdfFidelity(file, progress);
        downloadBytes(result.bytes, result.filename); setReport(result.report);
      } else {
        const result = await xlsxToPdfFidelity(file, progress);
        downloadBytes(result.bytes, result.filename); setReport(result.report);
      }
      setStatus({ type: "success", message: `${outputLabel(slug)} gerado. O download foi iniciado.`, progress: 100 });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível concluir a conversão." });
    }
  }

  const editableOutput = slug === "pdf-para-word" || slug === "pdf-para-excel";
  return <section className="workspace pro-pdf-workspace office-fidelity-workspace">
    <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); select(event.dataTransfer.files[0] || null); }}>
      <span className="drop-icon"><InputIcon size={31} /></span>
      <strong>Selecione seu {input.label}</strong>
      <span>Conversão local com análise de estrutura, páginas, texto e elementos compatíveis.</span>
      <button className="primary-button" type="button" onClick={() => fileRef.current?.click()}><UploadCloud size={18} /> Escolher {input.label}</button>
      <input ref={fileRef} hidden type="file" accept={input.accept} onChange={(event) => select(event.target.files?.[0] || null)} />
      <small>Até 80 MB · sem enviar o documento ao LIM PDF</small>
    </div>

    {file ? <div className="selected-files pro-selected-files"><div className="selected-file-row"><InputIcon size={17} /><span><strong>{file.name}</strong><small>{humanSize(file.size)} · saída {outputLabel(slug)}</small></span><button type="button" aria-label="Remover arquivo" onClick={() => { setFile(null); setReport([]); setStatus({ type: "idle" }); }}>×</button></div></div> : null}

    <div className="tool-options pro-tool-options">
      {slug === "pdf-para-word" ? <>
        <label><span>Modo de conversão</span><select value={wordMode} onChange={(event) => setWordMode(event.target.value as "editable" | "visual")}><option value="editable">Editável — reconstrói texto e linhas</option><option value="visual">Fidelidade visual — preserva a aparência de cada página</option></select></label>
        <div className="pro-info-card"><Presentation size={17} /><span><strong>{wordMode === "editable" ? "Documento editável" : "Fidelidade visual"}</strong><small>{wordMode === "editable" ? "O texto é reconstruído em parágrafos, com tamanho aproximado de fonte e quebras de página." : "Cada página entra no DOCX como imagem de alta resolução. A aparência é priorizada sobre edição textual."}</small></span></div>
      </> : null}
      {slug === "pdf-para-excel" ? <div className="pro-info-card"><FileSpreadsheet size={17} /><span><strong>Geometria para planilha</strong><small>Linhas e colunas são inferidas pelas coordenadas reais do texto. Cada página gera uma aba.</small></span></div> : null}
      {slug === "word-para-pdf" ? <div className="pro-info-card"><FileText size={17} /><span><strong>Reconstrução DOCX local</strong><small>Parágrafos, tabelas, quebras de página e imagens raster compatíveis são interpretados a partir do OOXML.</small></span></div> : null}
      {slug === "excel-para-pdf" ? <div className="pro-info-card"><FileSpreadsheet size={17} /><span><strong>Planilha para páginas PDF</strong><small>Valores armazenados, shared strings e células são reconstruídos em tabelas paginadas.</small></span></div> : null}
      <div className="pro-info-card secure"><ShieldCheck size={17} /><span><strong>Privado no navegador</strong><small>{editableOutput ? "Se o PDF for apenas uma digitalização, rode OCR antes para obter texto editável." : "O arquivo Office é lido localmente; macros não são executadas."}</small></span></div>
    </div>

    <button className="process-button" type="button" disabled={!file || status.type === "processing"} onClick={() => void process()}>{status.type === "processing" ? <><LoaderCircle className="spin" size={18} /> {status.message || "Convertendo…"}</> : <>Converter para {outputLabel(slug)}</>}</button>
    {status.type === "processing" && typeof status.progress === "number" ? <div className="pro-progress"><i style={{ width: `${Math.max(2, Math.min(100, status.progress))}%` }} /><span>{Math.round(status.progress)}%</span></div> : null}
    {status.type === "success" ? <div className="status-message success"><CheckCircle2 size={18} /><span>{status.message}</span></div> : null}
    {status.type === "error" ? <div className="status-message error"><span>{status.message}</span></div> : null}
    {report.length ? <div className="pro-report"><strong>Relatório da conversão</strong>{report.map((item) => <span key={item}><CheckCircle2 size={14} /> {item}</span>)}</div> : null}
  </section>;
}
