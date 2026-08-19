"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Layers3, LoaderCircle, Search, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { OutputActions } from "@/components/OutputActions";
import { clearPreparedOutput, downloadBytes, humanSize } from "@/lib/browser-files";
import { createSearchablePdf, createSearchablePdfBatch, OCR_MAX_BATCH_FILES, type OcrPreprocess } from "@/lib/ocr-engine";
import { formatFileSizeLimit, getFileSizeGuidance, isFileWithinLimit, isPdfFile, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";

type Status = { type: "idle" | "processing" | "success" | "error"; message?: string; progress?: number };
type OcrReport = { files: number; pages: number; words: number; lowConfidenceWords: number; averageConfidence: number; pagesWithoutWords: number };

export function OcrWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [languages, setLanguages] = useState("por+eng+spa");
  const [preprocess, setPreprocess] = useState<OcrPreprocess>("automatic");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [report, setReport] = useState<OcrReport | null>(null);
  const processing = status.type === "processing";

  function selectFiles(selected: FileList | File[] | null) {
    if (!selected || processing) return;
    const candidates = Array.from(selected);
    if (!candidates.length) return;
    const invalid = candidates.find((candidate) => !isPdfFile(candidate));
    if (invalid) { setStatus({ type: "error", message: `"${invalid.name}" não é um arquivo PDF.` }); return; }
    const tooLarge = candidates.find((candidate) => !isFileWithinLimit(candidate, MAX_LOCAL_PDF_BYTES));
    if (tooLarge) { setStatus({ type: "error", message: `"${tooLarge.name}" ultrapassa ${formatFileSizeLimit()}.` }); return; }
    if (candidates.length > OCR_MAX_BATCH_FILES) {
      setStatus({ type: "error", message: `Selecione no máximo ${OCR_MAX_BATCH_FILES} PDFs por lote para manter o navegador estável.` });
      return;
    }
    clearPreparedOutput();
    setFiles(candidates); setReport(null); setStatus({ type: "idle" });
  }

  function clearFiles() {
    if (processing) return;
    clearPreparedOutput();
    setFiles([]); setReport(null); setStatus({ type: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  function openPicker() {
    if (!inputRef.current || processing) return;
    inputRef.current.value = "";
    inputRef.current.click();
  }

  async function process() {
    if (!files.length || processing) return;
    clearPreparedOutput();
    const processingFiles = files;
    const processingLanguages = languages;
    const processingMode = preprocess;
    setStatus({ type: "processing", message: "Preparando OCR…", progress: 1 });
    try {
      if (processingFiles.length === 1) {
        const result = await createSearchablePdf(processingFiles[0], processingLanguages, (message, progress) => setStatus((previous) => ({ type: "processing", message, progress: progress ?? previous.progress })), { preprocess: processingMode });
        downloadBytes(result.bytes, result.filename);
        setReport({ files: 1, pages: result.pages, words: result.recognizedWords, lowConfidenceWords: result.lowConfidenceWords, averageConfidence: result.averageConfidence, pagesWithoutWords: result.pagesWithoutWords });
        setStatus({ type: "success", message: "OCR concluído. O PDF pesquisável está pronto para imprimir ou baixar.", progress: 100 });
      } else {
        const result = await createSearchablePdfBatch(processingFiles, processingLanguages, (message, progress) => setStatus((previous) => ({ type: "processing", message, progress: progress ?? previous.progress })), { preprocess: processingMode });
        downloadBytes(new Uint8Array(await result.blob.arrayBuffer()), result.filename, result.blob.type);
        const summary = result.summaries.reduce((total, current) => ({ pages: total.pages + current.pages, words: total.words + current.recognizedWords, lowConfidenceWords: total.lowConfidenceWords + current.lowConfidenceWords, pagesWithoutWords: total.pagesWithoutWords + current.pagesWithoutWords, confidenceTotal: total.confidenceTotal + current.averageConfidence * current.recognizedWords }), { pages: 0, words: 0, lowConfidenceWords: 0, pagesWithoutWords: 0, confidenceTotal: 0 });
        setReport({ files: result.count, pages: summary.pages, words: summary.words, lowConfidenceWords: summary.lowConfidenceWords, averageConfidence: summary.words ? Math.round(summary.confidenceTotal / summary.words) : 0, pagesWithoutWords: summary.pagesWithoutWords });
        setStatus({ type: "success", message: `OCR em lote concluído. ${result.count} PDFs foram reunidos em um ZIP; escolha baixar o resultado.`, progress: 100 });
      }
    } catch (error) { setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível executar o OCR." }); }
  }

  return <section className={`workspace ocr-workspace ${processing ? "is-processing" : ""}`}>
    <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!processing) selectFiles(event.dataTransfer.files); }}>
      <span className="drop-icon"><UploadCloud size={31} /></span><strong>Selecione um ou vários PDFs escaneados</strong><span>O LIM PDF reconhece o texto e cria uma camada pesquisável sem mudar a aparência das páginas.</span>
      <button className="primary-button" type="button" disabled={processing} onClick={openPicker}><FileText size={18} /> Escolher PDF(s)</button>
      <input ref={inputRef} hidden multiple type="file" accept="application/pdf,.pdf" disabled={processing} onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => selectFiles(event.target.files)} /><small>Até {formatFileSizeLimit()} por PDF · até {OCR_MAX_BATCH_FILES} PDFs por lote · até 80 páginas por PDF · OCR no navegador</small>
    </div>
    {files.length ? <div className="selected-files">{files.map((selectedFile, index) => <div className="selected-file-row" key={`${selectedFile.name}-${selectedFile.size}-${index}`}><FileText size={17} /><span><strong>{selectedFile.name}</strong><small>{humanSize(selectedFile.size)}</small></span></div>)}<button className="secondary-button" type="button" disabled={processing} onClick={clearFiles}><Trash2 size={15} /> Limpar seleção</button></div> : null}
    {files.some((selectedFile) => getFileSizeGuidance(selectedFile).tier !== "standard") ? <div className="large-file-notice" role="status"><ShieldCheck size={16} /><span><strong>Processamento de arquivo grande</strong><small>O OCR pode demorar mais porque analisa cada página localmente e mantém limites de memória para evitar travamentos.</small></span></div> : null}
    <div className="tool-options ocr-options"><label><span>Idiomas do reconhecimento</span><select value={languages} disabled={processing} onChange={(event) => setLanguages(event.target.value)}><option value="por">Português</option><option value="eng">Inglês</option><option value="spa">Espanhol</option><option value="por+eng">Português + Inglês</option><option value="por+spa">Português + Espanhol</option><option value="por+eng+spa">Português + Inglês + Espanhol</option></select></label><label><span>Preparação da imagem</span><select value={preprocess} disabled={processing} onChange={(event) => setPreprocess(event.target.value as OcrPreprocess)}><option value="automatic">Automática: contraste e limpeza</option><option value="original">Original: sem pré-processamento</option></select></label><div className="ocr-info-card"><Search size={17} /><span><strong>Saída pesquisável</strong><small>O PDF mantém a página visual e recebe texto invisível alinhado ao reconhecimento.</small></span></div><div className="ocr-info-card secure"><ShieldCheck size={17} /><span><strong>Privacidade local</strong><small>O documento não é enviado ao LIM PDF. O navegador baixa apenas o motor OCR e os modelos de idioma necessários.</small></span></div><div className="ocr-info-card"><Layers3 size={17} /><span><strong>Relatório de qualidade</strong><small>Após o processamento, mostramos confiança média, palavras de baixa confiança e páginas sem texto.</small></span></div></div>
    <button className="process-button prominent-process" type="button" disabled={!files.length || processing} onClick={() => void process()}>{processing ? <><LoaderCircle className="spin" size={18} /> {status.message || "Reconhecendo…"}</> : <><Search size={18} /> {files.length > 1 ? "Reconhecer e preparar ZIP" : "Reconhecer texto e preparar PDF"}</>}</button>
    {processing && typeof status.progress === "number" ? <div className="ocr-progress" aria-label={`Progresso do OCR: ${Math.round(status.progress)}%`}><i style={{ width: `${Math.max(2, Math.min(100, status.progress))}%` }} /><span>{Math.round(status.progress)}%</span></div> : null}
    {status.type === "success" ? <div className="status-message success"><CheckCircle2 size={18} /><span>{status.message}{report ? ` ${report.files} arquivo(s), ${report.pages} página(s), ${report.words.toLocaleString("pt-BR")} palavra(s), confiança média de ${report.averageConfidence}%.${report.lowConfidenceWords ? ` ${report.lowConfidenceWords.toLocaleString("pt-BR")} palavra(s) abaixo de 60% de confiança.` : ""}${report.pagesWithoutWords ? ` ${report.pagesWithoutWords} página(s) não retornaram palavras reconhecidas.` : ""}` : ""}</span></div> : null}
    {status.type === "error" ? <div className="status-message error"><span>{status.message}</span></div> : null}
    <OutputActions />
  </section>;
}
