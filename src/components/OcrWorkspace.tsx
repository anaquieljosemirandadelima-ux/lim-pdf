"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle, Search, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { downloadBytes, humanSize } from "@/lib/browser-files";
import { createSearchablePdf } from "@/lib/ocr-engine";
import { isFileWithinLimit, isPdfFile, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";
type Status = { type: "idle" | "processing" | "success" | "error"; message?: string; progress?: number };

export function OcrWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [languages, setLanguages] = useState("por+eng+spa");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [report, setReport] = useState<{ pages: number; words: number } | null>(null);
  const processing = status.type === "processing";

  function selectFile(selected: File | null) {
    if (!selected || processing) return;
    if (!isPdfFile(selected)) { setStatus({ type: "error", message: "Selecione um arquivo PDF." }); return; }
    if (!isFileWithinLimit(selected, MAX_LOCAL_PDF_BYTES)) { setStatus({ type: "error", message: "O PDF ultrapassa 60 MB." }); return; }
    setFile(selected); setReport(null); setStatus({ type: "idle" });
  }

  function clearFile() {
    if (processing) return;
    setFile(null); setReport(null); setStatus({ type: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  function openPicker() {
    if (!inputRef.current || processing) return;
    inputRef.current.value = "";
    inputRef.current.click();
  }

  async function process() {
    if (!file || processing) return;
    const processingFile = file;
    const processingLanguages = languages;
    setStatus({ type: "processing", message: "Preparando OCR…", progress: 1 });
    try {
      const result = await createSearchablePdf(processingFile, processingLanguages, (message, progress) => setStatus({ type: "processing", message, progress }));
      downloadBytes(result.bytes, result.filename);
      setReport({ pages: result.pages, words: result.recognizedWords });
      setStatus({ type: "success", message: "OCR concluído. O PDF pesquisável foi baixado.", progress: 100 });
    } catch (error) { setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível executar o OCR." }); }
  }

  return <section className={`workspace ocr-workspace ${processing ? "is-processing" : ""}`}>
    <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!processing) selectFile(event.dataTransfer.files[0] || null); }}>
      <span className="drop-icon"><UploadCloud size={31} /></span><strong>Selecione um PDF escaneado</strong><span>O LIM PDF reconhece o texto e cria uma camada pesquisável sem mudar a aparência das páginas.</span>
      <button className="primary-button" type="button" disabled={processing} onClick={openPicker}><FileText size={18} /> Escolher PDF</button>
      <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" disabled={processing} onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => selectFile(event.target.files?.[0] || null)} /><small>Até 60 MB · até 80 páginas por execução · OCR no navegador</small>
    </div>
    {file ? <div className="selected-files"><div className="selected-file-row"><FileText size={17} /><span><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span><button type="button" aria-label="Remover arquivo" disabled={processing} onClick={clearFile}><Trash2 size={15} /></button></div></div> : null}
    <div className="tool-options ocr-options"><label><span>Idiomas do reconhecimento</span><select value={languages} disabled={processing} onChange={(event) => setLanguages(event.target.value)}><option value="por">Português</option><option value="eng">Inglês</option><option value="spa">Espanhol</option><option value="por+eng">Português + Inglês</option><option value="por+spa">Português + Espanhol</option><option value="por+eng+spa">Português + Inglês + Espanhol</option></select></label><div className="ocr-info-card"><Search size={17} /><span><strong>Saída pesquisável</strong><small>O PDF mantém a página visual e recebe texto invisível alinhado ao reconhecimento.</small></span></div><div className="ocr-info-card secure"><ShieldCheck size={17} /><span><strong>Privacidade</strong><small>O documento não é enviado ao LIM PDF. O navegador baixa o motor OCR e os modelos de idioma necessários.</small></span></div></div>
    <button className="process-button prominent-process" type="button" disabled={!file || processing} onClick={() => void process()}>{processing ? <><LoaderCircle className="spin" size={18} /> {status.message || "Reconhecendo…"}</> : <><Search size={18} /> Reconhecer texto e baixar PDF</>}</button>
    {processing && typeof status.progress === "number" ? <div className="ocr-progress"><i style={{ width: `${Math.max(2, Math.min(100, status.progress))}%` }} /><span>{Math.round(status.progress)}%</span></div> : null}
    {status.type === "success" ? <div className="status-message success"><CheckCircle2 size={18} /><span>{status.message}{report ? ` ${report.pages} página(s), ${report.words.toLocaleString("pt-BR")} palavra(s) posicionada(s).` : ""}</span></div> : null}
    {status.type === "error" ? <div className="status-message error"><span>{status.message}</span></div> : null}
  </section>;
}
