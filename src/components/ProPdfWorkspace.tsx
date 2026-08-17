"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FilePlus2, FileText, LoaderCircle, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { downloadBlob, downloadBytes, humanSize } from "@/lib/browser-files";
import { formatFileSizeLimit, getFileSizeGuidance, isFileWithinLimit, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";
import type { ProToolDefinition } from "@/lib/pro-tools";
import {
  addBates,
  addNativeAnnotation,
  cleanScannedPdf,
  comparePdfs,
  createFormPdf,
  editMetadata,
  extractEmbeddedImages,
  optimizePdfAdvanced,
  pdfToPptx,
  pptxToPdf,
  preparePdfA,
  processBatch,
  readMetadata,
  repairPdf,
  signPdfPades,
  type FormFieldDraft,
  type MetadataDraft,
  type ScanRotation,
} from "@/lib/pro-pdf-engines";

type Status = { type: "idle" | "processing" | "success" | "error"; message?: string; progress?: number };
type AnnotationType = "note" | "highlight" | "underline" | "strikeout";
type BatchOperation = "metadata" | "number" | "confidential" | "structural";

function defaultField(index: number): FormFieldDraft {
  return { type: "text", name: `campo_${index + 1}`, page: 1, x: 72, y: 650, width: 220, height: 28, options: [] };
}

export function ProPdfWorkspace({ tool }: { tool: ProToolDefinition }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certificateRef = useRef<HTMLInputElement>(null);
  const privateKeyRef = useRef<HTMLInputElement>(null);
  const selectionVersionRef = useRef(0);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [report, setReport] = useState<string[]>([]);

  const [compareThreshold, setCompareThreshold] = useState(32);
  const [pageNumber, setPageNumber] = useState(1);
  const [x, setX] = useState(72); const [y, setY] = useState(72); const [width, setWidth] = useState(220); const [height, setHeight] = useState(40);
  const [annotationType, setAnnotationType] = useState<AnnotationType>("note");
  const [annotationText, setAnnotationText] = useState("Revisar este trecho");
  const [formDraft, setFormDraft] = useState<FormFieldDraft>(() => defaultField(0));
  const [formFields, setFormFields] = useState<FormFieldDraft[]>([]);
  const [cleanDeskew, setCleanDeskew] = useState(true); const [cleanBlank, setCleanBlank] = useState(true); const [cleanStrength, setCleanStrength] = useState(1); const [cleanRotate, setCleanRotate] = useState<ScanRotation>("auto");
  const [optimizeMode, setOptimizeMode] = useState<"structural" | "visual">("structural"); const [quality, setQuality] = useState(.76); const [dpiScale, setDpiScale] = useState(1.35); const [removeMetadata, setRemoveMetadata] = useState(true); const [flattenForms, setFlattenForms] = useState(false);
  const [batchOperation, setBatchOperation] = useState<BatchOperation>("metadata");
  const [batesPrefix, setBatesPrefix] = useState("DOC-"); const [batesStart, setBatesStart] = useState(1); const [batesDigits, setBatesDigits] = useState(6); const [batesPosition, setBatesPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">("bottom-right");
  const [metadata, setMetadata] = useState<MetadataDraft>({ title: "", author: "", subject: "", keywords: "", creator: "LIM PDF", producer: "LIM PDF" });
  const [certificatePem, setCertificatePem] = useState(""); const [privateKeyPem, setPrivateKeyPem] = useState(""); const [certificateName, setCertificateName] = useState(""); const [privateKeyName, setPrivateKeyName] = useState("");
  const [signerName, setSignerName] = useState(""); const [signReason, setSignReason] = useState("Assinatura digital do documento"); const [signVisible, setSignVisible] = useState(true);

  const multiple = tool.slug === "comparar-pdfs" || tool.slug === "processamento-lote-pdf";
  const requiredCount = tool.slug === "comparar-pdfs" ? 2 : 1;
  const ready = files.length >= requiredCount;
  const acceptedLabel = tool.slug === "powerpoint-para-pdf" ? "PPTX" : "PDF";
  const processing = status.type === "processing";
  const largestFile = files.reduce<File | null>((largest, current) => !largest || current.size > largest.size ? current : largest, null);
  const fileGuidance = largestFile ? getFileSizeGuidance(largestFile) : null;

  function validateSelection(selected: File[]) {
    const limit = tool.slug === "processamento-lote-pdf" ? 30 : tool.slug === "comparar-pdfs" ? 2 : 1;
    const filtered = selected.slice(0, limit);
    for (const file of filtered) {
      if (!isFileWithinLimit(file, MAX_LOCAL_PDF_BYTES)) throw new Error(`${file.name} ultrapassa ${formatFileSizeLimit()}.`);
      if (tool.slug === "powerpoint-para-pdf") {
        if (!file.name.toLowerCase().endsWith(".pptx")) throw new Error("Selecione um arquivo PPTX.");
      } else if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Selecione arquivo(s) PDF.");
      }
    }
    return filtered;
  }

  async function selectFiles(list: FileList | null) {
    if (!list || processing) return;
    const selectionVersion = ++selectionVersionRef.current;
    try {
      const selected = validateSelection(Array.from(list));
      setFiles(selected); setReport([]); setStatus({ type: "idle" });
      if (tool.slug === "editar-metadados-pdf" && selected[0]) {
        const nextMetadata = await readMetadata(selected[0]);
        if (selectionVersionRef.current === selectionVersion) setMetadata(nextMetadata);
      }
    } catch (error) {
      if (selectionVersionRef.current === selectionVersion) setStatus({ type: "error", message: error instanceof Error ? error.message : "Arquivo inválido." });
    }
  }

  function openFilePicker() {
    if (processing || !fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  }

  function removeFile(index: number) {
    if (processing) return;
    selectionVersionRef.current += 1;
    setFiles((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      if (!next.length && fileInputRef.current) fileInputRef.current.value = "";
      return next;
    });
    setReport([]);
    setStatus({ type: "idle" });
  }

  async function readTextFile(list: FileList | null, kind: "certificate" | "key") {
    if (processing) return;
    const file = list?.[0];
    if (!file) return;
    const text = await file.text();
    if (kind === "certificate") { setCertificatePem(text); setCertificateName(file.name); }
    else { setPrivateKeyPem(text); setPrivateKeyName(file.name); }
  }

  function progress(message: string, percent?: number) { setStatus({ type: "processing", message, progress: percent }); }

  async function process() {
    if (!ready || processing) return;
    setReport([]); progress("Preparando processamento…", 2);
    try {
      const file = files[0];
      if (tool.slug === "comparar-pdfs") {
        const result = await comparePdfs(files[0], files[1], compareThreshold, progress); downloadBytes(result.bytes, result.filename);
      } else if (tool.slug === "reparar-pdf") {
        const result = await repairPdf(file, progress); downloadBytes(result.bytes, result.filename); setReport([`Estratégia aplicada: ${result.mode === "estrutura" ? "normalização estrutural" : "reconstrução visual"}.`]);
      } else if (tool.slug === "extrair-imagens-pdf") {
        const result = await extractEmbeddedImages(file, progress); downloadBlob(result.blob, result.filename); setReport([`${result.count} imagem(ns) raster extraída(s).`]);
      } else if (tool.slug === "limpar-documento-digitalizado") {
        const result = await cleanScannedPdf(file, { deskew: cleanDeskew, removeBlank: cleanBlank, strength: cleanStrength, rotate: cleanRotate }, progress); downloadBytes(result.bytes, result.filename); setReport([`${result.removed} página(s) em branco removida(s).`]);
      } else if (tool.slug === "otimizar-pdf-avancado") {
        const result = await optimizePdfAdvanced(file, { mode: optimizeMode, quality, dpiScale, removeMetadata, flattenForms }, progress); downloadBytes(result.bytes, result.filename); setReport([`Modo aplicado: ${result.mode}.`]);
      } else if (tool.slug === "anotacoes-pdf") {
        const result = await addNativeAnnotation(file, { type: annotationType, page: pageNumber, x, y, width, height, text: annotationText }); downloadBytes(result.bytes, result.filename);
      } else if (tool.slug === "criar-formulario-pdf") {
        const result = await createFormPdf(file, formFields); downloadBytes(result.bytes, result.filename);
      } else if (tool.slug === "numeracao-bates") {
        const result = await addBates(file, { prefix: batesPrefix, start: batesStart, digits: batesDigits, position: batesPosition }); downloadBytes(result.bytes, result.filename);
      } else if (tool.slug === "editar-metadados-pdf") {
        const result = await editMetadata(file, metadata); downloadBytes(result.bytes, result.filename);
      } else if (tool.slug === "pdf-a") {
        const result = await preparePdfA(file); downloadBytes(result.bytes, result.filename); setReport(result.report);
      } else if (tool.slug === "pdf-para-powerpoint") {
        const result = await pdfToPptx(file, progress); downloadBlob(result.blob, result.filename);
      } else if (tool.slug === "powerpoint-para-pdf") {
        const result = await pptxToPdf(file, progress); downloadBytes(result.bytes, result.filename);
      } else if (tool.slug === "processamento-lote-pdf") {
        const result = await processBatch(files, batchOperation, progress); downloadBlob(result.blob, result.filename); setReport([`${result.count} arquivo(s) processado(s) e reunido(s) em ZIP.`]);
      } else if (tool.slug === "assinatura-digital-pdf") {
        if (!certificatePem || !privateKeyPem) throw new Error("Selecione o certificado X.509 PEM e a chave privada RSA PKCS#8 PEM.");
        const result = await signPdfPades(file, certificatePem, privateKeyPem, { name: signerName, reason: signReason, visible: signVisible });
        downloadBytes(result.bytes, result.filename); setReport(["CMS destacado aplicado com ETSI.CAdES.detached.", "A chave privada foi usada somente em memória pelo Web Crypto."]);
      } else {
        throw new Error("Esta ferramenta usa um workspace especializado.");
      }
      setStatus({ type: "success", message: "Processamento concluído. O download foi iniciado.", progress: 100 });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível concluir o processamento." });
    }
  }

  function addFormField() {
    if (!formDraft.name.trim()) return;
    setFormFields((current) => [...current, { ...formDraft, name: formDraft.name.trim(), options: formDraft.options?.filter(Boolean) }]);
    setFormDraft(defaultField(formFields.length + 1));
  }

  const coordinateFields = tool.slug === "anotacoes-pdf" ? <>
    <label><span>Página</span><input type="number" min={1} value={pageNumber} onChange={(event) => setPageNumber(Number(event.target.value) || 1)} /></label>
    <div className="pro-option-grid four"><label><span>X</span><input type="number" value={x} onChange={(event) => setX(Number(event.target.value) || 0)} /></label><label><span>Y</span><input type="number" value={y} onChange={(event) => setY(Number(event.target.value) || 0)} /></label><label><span>Largura</span><input type="number" min={8} value={width} onChange={(event) => setWidth(Number(event.target.value) || 8)} /></label><label><span>Altura</span><input type="number" min={8} value={height} onChange={(event) => setHeight(Number(event.target.value) || 8)} /></label></div>
  </> : null;

  return <section className="workspace pro-pdf-workspace" aria-busy={processing}>
    <div className="drop-zone" onDragOver={(event) => { if (!processing) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (!processing) void selectFiles(event.dataTransfer.files); }}>
      <span className="drop-icon"><UploadCloud size={31} /></span><strong>{multiple ? (tool.slug === "comparar-pdfs" ? "Selecione dois PDFs" : "Selecione seus PDFs") : `Selecione seu ${acceptedLabel}`}</strong><span>Arraste para esta área ou escolha no dispositivo.</span>
      <button className="primary-button" type="button" disabled={processing} onClick={openFilePicker}><FileText size={18} /> Escolher {acceptedLabel}</button>
      <input ref={fileInputRef} type="file" accept={tool.accept} multiple={multiple} hidden disabled={processing} onChange={(event) => void selectFiles(event.target.files)} /><small>Até {formatFileSizeLimit()} por arquivo · processamento local</small>
    </div>

    {fileGuidance && fileGuidance.tier !== "standard" ? <div className="large-file-notice" role="status"><ShieldCheck size={16} /><span><strong>Arquivo grande</strong><small>{fileGuidance.message} Operações avançadas podem usar mais memória durante a exportação.</small></span></div> : null}

    {files.length ? <div className="selected-files pro-selected-files"><div className="selected-files-head"><strong>{files.length} arquivo(s)</strong><span>{tool.name}</span></div>{files.map((file, index) => <div className="selected-file-row" key={`${file.name}-${index}`}><FileText size={17} /><span><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span><button type="button" disabled={processing} aria-label={`Remover ${file.name}`} onClick={() => removeFile(index)}><Trash2 size={15} /></button></div>)}</div> : null}

    <div className="tool-options pro-tool-options">
      {tool.slug === "comparar-pdfs" ? <label><span>Sensibilidade visual</span><input type="range" min={8} max={96} value={compareThreshold} onChange={(event) => setCompareThreshold(Number(event.target.value))} /><small>{compareThreshold}</small></label> : null}
      {tool.slug === "anotacoes-pdf" ? <><label><span>Tipo</span><select value={annotationType} onChange={(event) => setAnnotationType(event.target.value as AnnotationType)}><option value="note">Nota</option><option value="highlight">Destaque</option><option value="underline">Sublinhado</option><option value="strikeout">Tachado</option></select></label><label><span>Comentário</span><input value={annotationText} onChange={(event) => setAnnotationText(event.target.value)} /></label>{coordinateFields}</> : null}
      {tool.slug === "criar-formulario-pdf" ? <><div className="pro-option-grid three"><label><span>Tipo</span><select value={formDraft.type} onChange={(event) => setFormDraft({ ...formDraft, type: event.target.value as FormFieldDraft["type"] })}><option value="text">Texto</option><option value="date">Data</option><option value="checkbox">Checkbox</option><option value="radio">Rádio</option><option value="dropdown">Dropdown</option><option value="list">Lista</option><option value="signature">Assinatura</option></select></label><label><span>Nome do campo</span><input value={formDraft.name} onChange={(event) => setFormDraft({ ...formDraft, name: event.target.value })} /></label><label><span>Página</span><input type="number" min={1} value={formDraft.page} onChange={(event) => setFormDraft({ ...formDraft, page: Number(event.target.value) || 1 })} /></label></div><div className="pro-option-grid four"><label><span>X</span><input type="number" value={formDraft.x} onChange={(event) => setFormDraft({ ...formDraft, x: Number(event.target.value) || 0 })} /></label><label><span>Y</span><input type="number" value={formDraft.y} onChange={(event) => setFormDraft({ ...formDraft, y: Number(event.target.value) || 0 })} /></label><label><span>Largura</span><input type="number" value={formDraft.width} onChange={(event) => setFormDraft({ ...formDraft, width: Number(event.target.value) || 20 })} /></label><label><span>Altura</span><input type="number" value={formDraft.height} onChange={(event) => setFormDraft({ ...formDraft, height: Number(event.target.value) || 20 })} /></label></div>{["radio","dropdown","list"].includes(formDraft.type) ? <label><span>Opções separadas por vírgula</span><input value={(formDraft.options || []).join(", ")} onChange={(event) => setFormDraft({ ...formDraft, options: event.target.value.split(",").map((value) => value.trim()) })} /></label> : null}<button className="secondary-button" type="button" onClick={addFormField}><FilePlus2 size={16} /> Adicionar campo</button>{formFields.length ? <div className="pro-report"><strong>{formFields.length} campo(s) preparado(s)</strong>{formFields.map((field, index) => <span key={`${field.name}-${index}`}>{field.name} · {field.type} · pág. {field.page}</span>)}</div> : null}</> : null}
      {tool.slug === "limpar-documento-digitalizado" ? <><label className="checkbox-line"><input type="checkbox" checked={cleanDeskew} onChange={(event) => setCleanDeskew(event.target.checked)} /> Endireitar automaticamente</label><label className="checkbox-line"><input type="checkbox" checked={cleanBlank} onChange={(event) => setCleanBlank(event.target.checked)} /> Remover páginas em branco</label><label><span>Força da limpeza</span><input type="range" min={0} max={2} step={.25} value={cleanStrength} onChange={(event) => setCleanStrength(Number(event.target.value))} /></label><label><span>Rotação</span><select value={cleanRotate} onChange={(event) => { const value = event.target.value; setCleanRotate(value === "auto" ? "auto" : Number(value) as ScanRotation); }}><option value="auto">Automática</option><option value={0}>Nenhuma</option><option value={90}>90°</option><option value={180}>180°</option><option value={-90}>270°</option></select></label></> : null}
      {tool.slug === "otimizar-pdf-avancado" ? <><label><span>Modo</span><select value={optimizeMode} onChange={(event) => setOptimizeMode(event.target.value as "structural" | "visual")}><option value="structural">Estrutural — preserva texto e vetores</option><option value="visual">Visual — redução mais agressiva</option></select></label>{optimizeMode === "visual" ? <><label><span>Qualidade JPEG</span><input type="range" min={.35} max={.95} step={.05} value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label><label><span>Escala de renderização</span><input type="range" min={.8} max={2} step={.1} value={dpiScale} onChange={(event) => setDpiScale(Number(event.target.value))} /></label></> : null}<label className="checkbox-line"><input type="checkbox" checked={removeMetadata} onChange={(event) => setRemoveMetadata(event.target.checked)} /> Remover metadados</label><label className="checkbox-line"><input type="checkbox" checked={flattenForms} onChange={(event) => setFlattenForms(event.target.checked)} /> Achatar formulários</label></> : null}
      {tool.slug === "processamento-lote-pdf" ? <label><span>Operação do lote</span><select value={batchOperation} onChange={(event) => setBatchOperation(event.target.value as BatchOperation)}><option value="metadata">Remover metadados</option><option value="number">Numerar páginas</option><option value="confidential">Marcar CONFIDENCIAL</option><option value="structural">Normalizar estrutura</option></select></label> : null}
      {tool.slug === "numeracao-bates" ? <div className="pro-option-grid four"><label><span>Prefixo</span><input value={batesPrefix} onChange={(event) => setBatesPrefix(event.target.value)} /></label><label><span>Início</span><input type="number" value={batesStart} onChange={(event) => setBatesStart(Number(event.target.value) || 1)} /></label><label><span>Dígitos</span><input type="number" min={3} max={12} value={batesDigits} onChange={(event) => setBatesDigits(Number(event.target.value) || 6)} /></label><label><span>Posição</span><select value={batesPosition} onChange={(event) => setBatesPosition(event.target.value as typeof batesPosition)}><option value="bottom-right">Inferior direita</option><option value="bottom-left">Inferior esquerda</option><option value="top-right">Superior direita</option><option value="top-left">Superior esquerda</option></select></label></div> : null}
      {tool.slug === "editar-metadados-pdf" ? <div className="pro-option-grid two"><label><span>Título</span><input value={metadata.title || ""} onChange={(event) => setMetadata({ ...metadata, title: event.target.value })} /></label><label><span>Autor</span><input value={metadata.author || ""} onChange={(event) => setMetadata({ ...metadata, author: event.target.value })} /></label><label><span>Assunto</span><input value={metadata.subject || ""} onChange={(event) => setMetadata({ ...metadata, subject: event.target.value })} /></label><label><span>Palavras-chave</span><input value={metadata.keywords || ""} onChange={(event) => setMetadata({ ...metadata, keywords: event.target.value })} /></label></div> : null}
      {tool.slug === "assinatura-digital-pdf" ? <><div className="pro-option-grid two"><button className="secondary-button" type="button" disabled={processing} onClick={() => certificateRef.current?.click()}><ShieldCheck size={16} /> {certificateName || "Certificado X.509 PEM"}</button><button className="secondary-button" type="button" disabled={processing} onClick={() => privateKeyRef.current?.click()}><ShieldCheck size={16} /> {privateKeyName || "Chave RSA PKCS#8 PEM"}</button><input ref={certificateRef} hidden disabled={processing} type="file" accept=".pem,.crt,.cer,text/plain" onChange={(event) => void readTextFile(event.target.files, "certificate")} /><input ref={privateKeyRef} hidden disabled={processing} type="file" accept=".pem,.key,text/plain" onChange={(event) => void readTextFile(event.target.files, "key")} /></div><label><span>Nome do signatário</span><input value={signerName} onChange={(event) => setSignerName(event.target.value)} /></label><label><span>Motivo</span><input value={signReason} onChange={(event) => setSignReason(event.target.value)} /></label><label className="checkbox-line"><input type="checkbox" checked={signVisible} onChange={(event) => setSignVisible(event.target.checked)} /> Inserir aparência visual da assinatura</label></> : null}
    </div>

    <button className="process-button" type="button" disabled={!ready || processing} onClick={() => void process()}>{processing ? <><LoaderCircle className="spin" size={18} /> {status.message || "Processando…"}</> : <>Executar {tool.name}</>}</button>
    {processing && typeof status.progress === "number" ? <div className="pro-progress"><i style={{ width: `${Math.max(2, Math.min(100, status.progress))}%` }} /><span>{Math.round(status.progress)}%</span></div> : null}
    {status.type === "success" ? <div className="status-message success" role="status" aria-live="polite"><CheckCircle2 size={18} /><span>{status.message}</span></div> : null}
    {status.type === "error" ? <div className="status-message error" role="alert" aria-live="assertive"><span>{status.message}</span></div> : null}
    {report.length ? <div className="pro-report"><strong>Relatório</strong>{report.map((item) => <span key={item}>{item}</span>)}</div> : null}
  </section>;
}
