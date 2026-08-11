"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileOutput, FileSpreadsheet, FileText, Image as ImageIcon, LoaderCircle, Presentation, Repeat2, ShieldCheck, UploadCloud } from "lucide-react";
import { createStoredZipFromBlobs, downloadBlob, downloadBytes, humanSize } from "@/lib/browser-files";
import { canvasToBlob, extractTextByPage, renderPdfPagesSequentially } from "@/lib/pdf-render";
import { docxToPdfFidelity, pdfToDocxFidelity, pdfToXlsxFidelity, xlsxToPdfFidelity } from "@/lib/office-fidelity-engines";
import { pdfToPptx, pptxToPdf } from "@/lib/pro-pdf-engines";

const MAX_FILE_SIZE = 80 * 1024 * 1024;
const MAX_IMAGE_OUTPUT = 280 * 1024 * 1024;

type Target = "docx" | "xlsx" | "pptx" | "jpg" | "png" | "txt" | "pdf";
type InputKind = "pdf" | "docx" | "xlsx" | "pptx";
type Status = { type: "idle" | "processing" | "success" | "error"; message?: string; progress?: number };

type ToolLike = { slug: string; name: string };

const TARGET_LABEL: Record<Target, string> = { docx: "Word (DOCX)", xlsx: "Excel (XLSX)", pptx: "PowerPoint (PPTX)", jpg: "JPG", png: "PNG", txt: "Texto (TXT)", pdf: "PDF" };

function kindOf(file: File): InputKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".xlsx")) return "xlsx";
  if (name.endsWith(".pptx")) return "pptx";
  return null;
}

function defaultTarget(slug: string, input: InputKind): Target {
  const map: Record<string, Target> = {
    "pdf-para-word": "docx",
    "pdf-para-excel": "xlsx",
    "pdf-para-powerpoint": "pptx",
    "pdf-para-jpg": "jpg",
    "pdf-para-png": "png",
    "extrair-texto-pdf": "txt",
    "word-para-pdf": "pdf",
    "excel-para-pdf": "pdf",
    "powerpoint-para-pdf": "pdf",
  };
  return map[slug] || (input === "pdf" ? "docx" : "pdf");
}

function allowedTargets(input: InputKind): Target[] {
  return input === "pdf" ? ["docx", "xlsx", "pptx", "jpg", "png", "txt"] : ["pdf"];
}

function baseName(file: File) { return file.name.replace(/\.[^.]+$/, ""); }

export function UnifiedConverterWorkspace({ tool }: { tool: ToolLike }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [inputKind, setInputKind] = useState<InputKind | null>(null);
  const [target, setTarget] = useState<Target>("docx");
  const [wordMode, setWordMode] = useState<"editable" | "visual">("editable");
  const [imageQuality, setImageQuality] = useState(.9);
  const [imageScale, setImageScale] = useState(1.7);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [report, setReport] = useState<string[]>([]);

  const targets = useMemo(() => inputKind ? allowedTargets(inputKind) : [], [inputKind]);

  function select(selected: File | null) {
    if (!selected) return;
    const kind = kindOf(selected);
    if (!kind) return setStatus({ type: "error", message: "Selecione PDF, DOCX, XLSX ou PPTX." });
    if (selected.size > MAX_FILE_SIZE) return setStatus({ type: "error", message: "O arquivo ultrapassa 80 MB." });
    setFile(selected);
    setInputKind(kind);
    setTarget(defaultTarget(tool.slug, kind));
    setReport([]);
    setStatus({ type: "idle" });
  }

  function progress(message: string, percent?: number) { setStatus({ type: "processing", message, progress: percent }); }

  async function pdfImages(selected: File, format: "jpg" | "png") {
    const blobs: { name: string; data: Blob }[] = [];
    let totalBytes = 0;
    await renderPdfPagesSequentially(await selected.arrayBuffer(), imageScale, async ({ pageNumber, canvas }, current) => {
      progress(`Renderizando página ${current.pageNumber} de ${current.totalPages}…`, Math.round((current.pageNumber / current.totalPages) * 92));
      const blob = await canvasToBlob(canvas, format === "jpg" ? "image/jpeg" : "image/png", imageQuality);
      totalBytes += blob.size;
      if (totalBytes > MAX_IMAGE_OUTPUT) throw new Error("A saída de imagens ultrapassaria 280 MB. Reduza a resolução ou processe menos páginas.");
      blobs.push({ name: `${baseName(selected)}-pagina-${String(pageNumber).padStart(3, "0")}.${format}`, data: blob });
    });
    if (blobs.length === 1) downloadBlob(blobs[0].data, blobs[0].name);
    else downloadBlob(await createStoredZipFromBlobs(blobs), `${baseName(selected)}-${format}-lim-pdf.zip`);
    return [`${blobs.length} página(s) convertida(s)`, `Resolução ${Math.round(imageScale * 100)}% do canvas base`, format === "jpg" ? `Qualidade JPG ${Math.round(imageQuality * 100)}%` : "PNG sem perdas por compressão JPEG"];
  }

  async function process() {
    if (!file || !inputKind || status.type === "processing") return;
    setReport([]);
    progress("Preparando conversão…", 2);
    try {
      if (inputKind === "pdf") {
        if (target === "docx") {
          const result = await pdfToDocxFidelity(file, wordMode, progress); downloadBlob(result.blob, result.filename); setReport(result.report);
        } else if (target === "xlsx") {
          const result = await pdfToXlsxFidelity(file, progress); downloadBlob(result.blob, result.filename); setReport(result.report);
        } else if (target === "pptx") {
          progress("Montando apresentação…", 18); const result = await pdfToPptx(file); downloadBlob(result.blob, result.filename); setReport(["Um slide por página", "Proporção do documento preservada", "Conversão local no navegador"]);
        } else if (target === "txt") {
          progress("Extraindo camada de texto…", 18); const pages = await extractTextByPage(await file.arrayBuffer());
          const text = pages.map((page, index) => `--- Página ${index + 1} ---\n${page}`).join("\n\n");
          downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${baseName(file)}-lim-pdf.txt`); setReport([`${pages.length} página(s) analisada(s)`, "Texto separado por página"]);
        } else if (target === "jpg" || target === "png") setReport(await pdfImages(file, target));
        else throw new Error("Formato de saída incompatível com PDF.");
      } else if (inputKind === "docx") {
        const result = await docxToPdfFidelity(file, progress); downloadBytes(result.bytes, result.filename); setReport(result.report);
      } else if (inputKind === "xlsx") {
        const result = await xlsxToPdfFidelity(file, progress); downloadBytes(result.bytes, result.filename); setReport(result.report);
      } else {
        progress("Reconstruindo slides em PDF…", 15); const result = await pptxToPdf(file); downloadBytes(result.bytes, result.filename); setReport(["Ordem declarada dos slides preservada", "Texto e imagens compatíveis reconstruídos", "Conversão local no navegador"]);
      }
      setStatus({ type: "success", message: `${TARGET_LABEL[target]} gerado. O download foi iniciado.`, progress: 100 });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível concluir a conversão." });
    }
  }

  return <section className="workspace unified-converter" data-input-kind={inputKind || "none"}>
    {!file ? <div className="drop-zone converter-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); select(event.dataTransfer.files[0] || null); }}>
      <span className="drop-icon"><Repeat2 size={31} /></span><strong>Escolha o arquivo que deseja converter</strong><span>PDF, Word, Excel ou PowerPoint. Depois do upload você escolhe o formato de saída sem trocar de página.</span>
      <button className="primary-button large-button" type="button" onClick={() => inputRef.current?.click()}><UploadCloud size={18} /> Selecionar arquivo</button>
      <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf,.docx,.xlsx,.pptx" onChange={(event) => select(event.target.files?.[0] || null)} />
      <small>Até 80 MB · processamento local no navegador</small>
    </div> : <>
      <div className="converter-focus-card">
        <div className="converter-file-summary"><FileText size={22} /><span><strong>{file.name}</strong><small>{humanSize(file.size)} · entrada {inputKind?.toUpperCase()}</small></span><button type="button" className="secondary-button compact" onClick={() => inputRef.current?.click()}>Trocar arquivo</button><input ref={inputRef} hidden type="file" accept="application/pdf,.pdf,.docx,.xlsx,.pptx" onChange={(event) => select(event.target.files?.[0] || null)} /></div>
        <div className="converter-primary-action"><label><span>Converter para</span><select value={target} onChange={(event) => setTarget(event.target.value as Target)}>{targets.map((item) => <option key={item} value={item}>{TARGET_LABEL[item]}</option>)}</select></label><button className="process-button converter-cta" type="button" disabled={status.type === "processing"} onClick={() => void process()}>{status.type === "processing" ? <><LoaderCircle className="spin" size={18} /> {status.message || "Convertendo…"}</> : <><FileOutput size={18} /> Converter para {TARGET_LABEL[target]}</>}</button></div>
        <small className="converter-hint">Você pode mudar o formato acima sem reenviar o arquivo.</small>
      </div>

      <details className="converter-advanced" open={target === "docx" && inputKind === "pdf"}><summary>Opções de qualidade</summary><div className="tool-options">
        {target === "docx" && inputKind === "pdf" ? <label><span>Word</span><select value={wordMode} onChange={(event) => setWordMode(event.target.value as "editable" | "visual")}><option value="editable">Editável — reconstrói texto e estrutura</option><option value="visual">Fidelidade visual — preserva a aparência</option></select></label> : null}
        {(target === "jpg" || target === "png") && inputKind === "pdf" ? <><label><span>Resolução</span><select value={imageScale} onChange={(event) => setImageScale(Number(event.target.value))}><option value={1.2}>Normal</option><option value={1.7}>Alta</option><option value={2.2}>Muito alta</option></select></label>{target === "jpg" ? <label><span>Qualidade JPG</span><input type="range" min="0.6" max="0.98" step="0.02" value={imageQuality} onChange={(event) => setImageQuality(Number(event.target.value))} /></label> : null}</> : null}
        <div className="converter-format-grid"><span><FileText size={16} /> DOCX</span><span><FileSpreadsheet size={16} /> XLSX</span><span><Presentation size={16} /> PPTX</span><span><ImageIcon size={16} /> JPG/PNG</span></div>
        <div className="pro-info-card secure"><ShieldCheck size={17} /><span><strong>Privado no navegador</strong><small>O documento é processado localmente. Se um PDF for apenas imagem, use OCR antes para gerar texto editável.</small></span></div>
      </div></details>
    </>}

    {status.type === "processing" && typeof status.progress === "number" ? <div className="pro-progress"><i style={{ width: `${Math.max(2, Math.min(100, status.progress))}%` }} /><span>{Math.round(status.progress)}%</span></div> : null}
    {status.type === "success" ? <div className="status-message success"><CheckCircle2 size={18} /><span>{status.message}</span></div> : null}
    {status.type === "error" ? <div className="status-message error"><span>{status.message}</span></div> : null}
    {report.length ? <div className="pro-report"><strong>Relatório da conversão</strong>{report.map((item) => <span key={item}><CheckCircle2 size={14} /> {item}</span>)}</div> : null}
  </section>;
}
