"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FilePlus2, FileText, LoaderCircle, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import type { ProToolDefinition } from "@/lib/pro-tools";
import { downloadBlob, downloadBytes, humanSize } from "@/lib/browser-files";
import {
  addBates, addBookmarks, addHyperlink, addInternalPageLink, addNativeAnnotation,
  cleanScannedPdf, comparePdfs, createFormPdf, editMetadata, extractEmbeddedImages,
  ocrPdf, optimizePdfAdvanced, pdfToPptx, pptxToPdf, preparePdfA, processBatch,
  readMetadata, repairPdf, signPdfPades,
  type BookmarkDraft, type FormFieldDraft, type MetadataDraft,
} from "@/lib/pro-pdf-engines";

const MAX_FILE_SIZE = 80 * 1024 * 1024;
type Status = { type: "idle" | "processing" | "success" | "error"; message?: string; progress?: number };
type AnnotationType = "note" | "highlight" | "underline" | "strikeout";

function defaultField(index: number): FormFieldDraft {
  return { type: "text", name: `campo_${index + 1}`, page: 1, x: 72, y: 650, width: 220, height: 28, options: [] };
}

export function ProPdfWorkspace({ tool }: { tool: ProToolDefinition }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certificateRef = useRef<HTMLInputElement>(null);
  const privateKeyRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [report, setReport] = useState<string[]>([]);

  const [ocrLanguages, setOcrLanguages] = useState("por+eng+spa");
  const [compareThreshold, setCompareThreshold] = useState(32);
  const [linkMode, setLinkMode] = useState<"url" | "page">("url");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [targetPage, setTargetPage] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [x, setX] = useState(72); const [y, setY] = useState(72); const [width, setWidth] = useState(220); const [height, setHeight] = useState(40);
  const [annotationType, setAnnotationType] = useState<AnnotationType>("note");
  const [annotationText, setAnnotationText] = useState("Revisar este trecho");
  const [formDraft, setFormDraft] = useState<FormFieldDraft>(() => defaultField(0));
  const [formFields, setFormFields] = useState<FormFieldDraft[]>([]);
  const [bookmarkTitle, setBookmarkTitle] = useState("Capítulo 1");
  const [bookmarks, setBookmarks] = useState<BookmarkDraft[]>([]);
  const [cleanDeskew, setCleanDeskew] = useState(true); const [cleanBlank, setCleanBlank] = useState(true); const [cleanStrength, setCleanStrength] = useState(1); const [cleanRotate, setCleanRotate] = useState(0);
  const [optimizeMode, setOptimizeMode] = useState<"structural" | "visual">("structural"); const [quality, setQuality] = useState(.76); const [dpiScale, setDpiScale] = useState(1.35); const [removeMetadata, setRemoveMetadata] = useState(true); const [flattenForms, setFlattenForms] = useState(false);
  const [batchOperation, setBatchOperation] = useState<"metadata" | "number" | "confidential" | "structural">("metadata");
  const [batesPrefix, setBatesPrefix] = useState("DOC-"); const [batesStart, setBatesStart] = useState(1); const [batesDigits, setBatesDigits] = useState(6); const [batesPosition, setBatesPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">("bottom-right");
  const [metadata, setMetadata] = useState<MetadataDraft>({ title: "", author: "", subject: "", keywords: "", creator: "LIM PDF", producer: "LIM PDF" });
  const [certificatePem, setCertificatePem] = useState(""); const [privateKeyPem, setPrivateKeyPem] = useState(""); const [certificateName, setCertificateName] = useState(""); const [privateKeyName, setPrivateKeyName] = useState("");
  const [signerName, setSignerName] = useState(""); const [signReason, setSignReason] = useState("Assinatura digital do documento"); const [signVisible, setSignVisible] = useState(true);

  const multiple = tool.slug === "comparar-pdfs" || tool.slug === "processamento-lote-pdf";
  const requiredCount = tool.slug === "comparar-pdfs" ? 2 : 1;
  const ready = files.length >= requiredCount;
  const acceptedLabel = tool.slug === "powerpoint-para-pdf" ? "PPTX" : "PDF";
  const optionsSummary = useMemo(() => {
    if (tool.slug === "ocr-pdf") return `OCR: ${ocrLanguages.replaceAll("+", ", ")}`;
    if (tool.slug === "comparar-pdfs") return `Sensibilidade: ${compareThreshold}`;
    if (tool.slug === "limpar-documento-digitalizado") return `${cleanDeskew ? "Endireitar" : "Sem deskew"} · força ${cleanStrength}`;
    if (tool.slug === "otimizar-pdf-avancado") return optimizeMode === "structural" ? "Preserva texto e vetores" : `Visual · qualidade ${Math.round(quality * 100)}%`;
    if (tool.slug === "processamento-lote-pdf") return `Lote: ${batchOperation}`;
    return "Processamento local";
  }, [batchOperation, cleanDeskew, cleanStrength, compareThreshold, ocrLanguages, optimizeMode, quality, tool.slug]);

  function validateSelection(selected: File[]) {
    const filtered = selected.slice(0, tool.slug === "processamento-lote-pdf" ? 30 : tool.slug === "comparar-pdfs" ? 2 : 1);
    if (!filtered.length) return [];
    for (const file of filtered) {
      if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} ultrapassa 80 MB.`);
      if (tool.slug === "powerpoint-para-pdf") {
        if (!file.name.toLowerCase().endsWith(".pptx")) throw new Error("Selecione um arquivo PPTX.");
      } else if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Selecione arquivos PDF.");
    }
    return filtered;
  }

  async function selectFiles(list: FileList | null) {
    if (!list) return;
    try {
      const candidates = tool.slug === "processamento-lote-pdf" ? Array.from(list).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) : Array.from(list);
      const selected = validateSelection(candidates);
      setFiles(selected); setReport([]); setStatus({ type: "idle" });
      if (tool.slug === "editar-metadados-pdf" && selected[0]) setMetadata(await readMetadata(selected[0]));
    } catch (error) { setStatus({ type: "error", message: error instanceof Error ? error.message : "Arquivo inválido." }); }
  }

  async function readTextFile(list: FileList | null, kind: "certificate" | "key") {
    const file = list?.[0]; if (!file) return; const text = await file.text();
    if (kind === "certificate") { setCertificatePem(text); setCertificateName(file.name); } else { setPrivateKeyPem(text); setPrivateKeyName(file.name); }
  }
  function progress(message: string, percent?: number) { setStatus({ type: "processing", message, progress: percent }); }

  async function process() {
    if (!ready || status.type === "processing") return;
    setReport([]); progress("Preparando processamento…", 2);
    try {
      const file = files[0];
      if (tool.slug === "ocr-pdf") { const result = await ocrPdf(file, ocrLanguages, progress); downloadBytes(result.bytes, result.filename); }
      else if (tool.slug === "comparar-pdfs") { const result = await comparePdfs(files[0], files[1], compareThreshold, progress); downloadBytes(result.bytes, result.filename); }
      else if (tool.slug === "reparar-pdf") { const result = await repairPdf(file, progress); downloadBytes(result.bytes, result.filename); setReport([`Estratégia: ${result.mode === "estrutura" ? "normalização estrutural" : "reconstrução visual"}.`]); }
      else if (tool.slug === "extrair-imagens-pdf") { const result = await extractEmbeddedImages(file, progress); downloadBlob(result.blob, result.filename); setReport([`${result.count} imagem(ns) raster extraída(s).`]); }
      else if (tool.slug === "limpar-documento-digitalizado") { const result = await cleanScannedPdf(file, { deskew: cleanDeskew, removeBlank: cleanBlank, strength: cleanStrength, rotate: cleanRotate }, progress); downloadBytes(result.bytes, result.filename); setReport([`${result.removed} página(s) em branco removida(s).`]); }
      else if (tool.slug === "otimizar-pdf-avancado") { const result = await optimizePdfAdvanced(file, { mode: optimizeMode, quality, dpiScale, removeMetadata, flattenForms }, progress); downloadBytes(result.bytes, result.filename); setReport([`Modo aplicado: ${result.mode}.`]); }
      else if (tool.slug === "links-pdf") {
        const result = linkMode === "url" ? await addHyperlink(file, { url: linkUrl, page: pageNumber, x, y, width, height }) : await addInternalPageLink(file, { sourcePage: pageNumber, targetPage, x, y, width, height });
        downloadBytes(result.bytes, result.filename);
      }
      else if (tool.slug === "anotacoes-pdf") { const result = await addNativeAnnotation(file, { type: annotationType, page: pageNumber, x, y, width, height, text: annotationText }); downloadBytes(result.bytes, result.filename); }
      else if (tool.slug === "criar-formulario-pdf") { const result = await createFormPdf(file, formFields); downloadBytes(result.bytes, result.filename); }
      else if (tool.slug === "bookmarks-pdf") { const result = await addBookmarks(file, bookmarks); downloadBytes(result.bytes, result.filename); }
      else if (tool.slug === "numeracao-bates") { const result = await addBates(file, { prefix: batesPrefix, start: batesStart, digits: batesDigits, position: batesPosition }); downloadBytes(result.bytes, result.filename); }
      else if (tool.slug === "editar-metadados-pdf") { const result = await editMetadata(file, metadata); downloadBytes(result.bytes, result.filename); }
      else if (tool.slug === "pdf-a") { const result = await preparePdfA(file); downloadBytes(result.bytes, result.filename); setReport(result.report); }
      else if (tool.slug === "pdf-para-powerpoint") { const result = await pdfToPptx(file, progress); downloadBlob(result.blob, result.filename); }
      else if (tool.slug === "powerpoint-para-pdf") { const result = await pptxToPdf(file, progress); downloadBytes(result.bytes, result.filename); }
      else if (tool.slug === "processamento-lote-pdf") { const result = await processBatch(files, batchOperation, progress); downloadBlob(result.blob, result.filename); setReport([`${result.count} arquivos processados e reunidos em ZIP.`]); }
      else if (tool.slug === "assinatura-digital-pdf") {
        if (!certificatePem || !privateKeyPem) throw new Error("Selecione o certificado X.509 PEM e a chave privada RSA PKCS#8 PEM.");
        const result = await signPdfPades(file, certificatePem, privateKeyPem, { name: signerName, reason: signReason, visible: signVisible });
        downloadBytes(result.bytes, result.filename); setReport(["CMS destacado aplicado com ETSI.CAdES.detached.", "A chave privada foi usada somente em memória pelo Web Crypto."]);
      }
      setStatus({ type: "success", message: "Processamento concluído. O download foi iniciado.", progress: 100 });
    } catch (error) { setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível concluir o processamento." }); }
  }

  function addFormField() {
    if (!formDraft.name.trim()) return;
    setFormFields((current) => [...current, { ...formDraft, name: formDraft.name.trim(), options: formDraft.options?.filter(Boolean) }]);
    setFormDraft(defaultField(formFields.length + 1));
  }
  function addBookmark() {
    if (!bookmarkTitle.trim()) return;
    setBookmarks((current) => [...current, { title: bookmarkTitle.trim(), page: pageNumber }]); setBookmarkTitle(`Capítulo ${bookmarks.length + 2}`);
  }

  const coordinates = (tool.slug === "links-pdf" || tool.slug === "anotacoes-pdf") ? <>
    <label><span>Página</span><input type="number" min={1} value={pageNumber} onChange={(event) => setPageNumber(Number(event.target.value) || 1)} /></label>
    <div className="pro-option-grid four"><label><span>X</span><input type="number" value={x} onChange={(event) => setX(Number(event.target.value) || 0)} /></label><label><span>Y</span><input type="number" value={y} onChange={(event) => setY(Number(event.target.value) || 0)} /></label><label><span>Largura</span><input type="number" min={8} value={width} onChange={(event) => setWidth(Number(event.target.value) || 8)} /></label><label><span>Altura</span><input type="number" min={8} value={height} onChange={(event) => setHeight(Number(event.target.value) || 8)} /></label></div>
    <small>Coordenadas PDF em pontos; origem no canto inferior esquerdo.</small>
  </> : null;

  return <section className="workspace pro-pdf-workspace">
    <div className="drop-zone" onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add("dragging"); }} onDragLeave={(event) => event.currentTarget.classList.remove("dragging")} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove("dragging"); void selectFiles(event.dataTransfer.files); }}>
      <span className="drop-icon"><UploadCloud size={31} /></span>
      <strong>{multiple ? `Selecione ${tool.slug === "comparar-pdfs" ? "dois documentos" : "seus documentos"}` : `Selecione seu ${acceptedLabel}`}</strong>
      <span>Arraste para esta área ou escolha no dispositivo.</span>
      <button className="primary-button" type="button" onClick={() => fileInputRef.current?.click()}><FileText size={18} /> Escolher {acceptedLabel}</button>
      <input ref={fileInputRef} type="file" accept={tool.accept} multiple={multiple} hidden onChange={(event) => void selectFiles(event.target.files)} />
      <small>Até 80 MB por arquivo · processamento no navegador</small>
    </div>

    {files.length ? <div className="selected-files pro-selected-files"><div className="selected-files-head"><strong>{files.length} arquivo(s)</strong><span>{optionsSummary}</span></div>{files.map((file, index) => <div className="selected-file-row" key={`${file.name}-${index}`}><FileText size={17} /><span><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span><button type="button" aria-label={`Remover ${file.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button></div>)}</div> : null}

    <div className="tool-options pro-tool-options">
      {tool.slug === "ocr-pdf" ? <><label><span>Idiomas do reconhecimento</span><select value={ocrLanguages} onChange={(event) => setOcrLanguages(event.target.value)}><option value="por">Português</option><option value="eng">Inglês</option><option value="spa">Espanhol</option><option value="por+eng">Português + Inglês</option><option value="por+eng+spa">Português + Inglês + Espanhol</option></select></label><Info title="OCR real">Tesseract WebAssembly reconhece cada página e cria uma camada pesquisável.</Info></> : null}
      {tool.slug === "comparar-pdfs" ? <label><span>Sensibilidade visual</span><input type="range" min={8} max={80} value={compareThreshold} onChange={(event) => setCompareThreshold(Number(event.target.value))} /><small>{compareThreshold} — menor detecta alterações mais sutis.</small></label> : null}
      {tool.slug === "links-pdf" ? <><label><span>Destino</span><select value={linkMode} onChange={(event) => setLinkMode(event.target.value as "url" | "page")}><option value="url">Endereço web</option><option value="page">Página interna</option></select></label>{linkMode === "url" ? <label><span>URL</span><input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://exemplo.com" /></label> : <label><span>Página de destino</span><input type="number" min={1} value={targetPage} onChange={(event) => setTargetPage(Number(event.target.value) || 1)} /></label>}{coordinates}</> : null}
      {tool.slug === "anotacoes-pdf" ? <><label><span>Tipo</span><select value={annotationType} onChange={(event) => setAnnotationType(event.target.value as AnnotationType)}><option value="note">Nota</option><option value="highlight">Destaque</option><option value="underline">Sublinhado</option><option value="strikeout">Riscado</option></select></label><label><span>Comentário</span><textarea value={annotationText} onChange={(event) => setAnnotationText(event.target.value)} /></label>{coordinates}</> : null}
      {tool.slug === "criar-formulario-pdf" ? <><div className="pro-option-grid two"><label><span>Tipo</span><select value={formDraft.type} onChange={(event) => setFormDraft((current) => ({ ...current, type: event.target.value as FormFieldDraft["type"] }))}><option value="text">Texto</option><option value="date">Data</option><option value="signature">Campo de assinatura digital</option><option value="checkbox">Checkbox</option><option value="radio">Rádio</option><option value="dropdown">Dropdown</option><option value="list">Lista</option></select></label><label><span>Nome</span><input value={formDraft.name} onChange={(event) => setFormDraft((current) => ({ ...current, name: event.target.value }))} /></label></div><div className="pro-option-grid four"><label><span>Página</span><input type="number" min={1} value={formDraft.page} onChange={(event) => setFormDraft((current) => ({ ...current, page: Number(event.target.value) || 1 }))} /></label><label><span>X</span><input type="number" value={formDraft.x} onChange={(event) => setFormDraft((current) => ({ ...current, x: Number(event.target.value) || 0 }))} /></label><label><span>Y</span><input type="number" value={formDraft.y} onChange={(event) => setFormDraft((current) => ({ ...current, y: Number(event.target.value) || 0 }))} /></label><label><span>L × A</span><input value={`${formDraft.width} × ${formDraft.height}`} readOnly /></label></div>{["radio", "dropdown", "list"].includes(formDraft.type) ? <label><span>Opções por vírgula</span><input value={(formDraft.options || []).join(", ")} onChange={(event) => setFormDraft((current) => ({ ...current, options: event.target.value.split(",").map((value) => value.trim()) }))} /></label> : null}<div className="pro-option-grid two"><label><span>Largura</span><input type="number" min={8} value={formDraft.width} onChange={(event) => setFormDraft((current) => ({ ...current, width: Number(event.target.value) || 8 }))} /></label><label><span>Altura</span><input type="number" min={8} value={formDraft.height} onChange={(event) => setFormDraft((current) => ({ ...current, height: Number(event.target.value) || 8 }))} /></label></div><button type="button" className="secondary-button pro-add-button" onClick={addFormField}><FilePlus2 size={15} /> Adicionar campo</button><ChipList values={formFields.map((field) => `${field.name} · ${field.type} · pág. ${field.page}`)} onRemove={(index) => setFormFields((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></> : null}
      {tool.slug === "bookmarks-pdf" ? <><label><span>Título</span><input value={bookmarkTitle} onChange={(event) => setBookmarkTitle(event.target.value)} /></label><label><span>Página de destino</span><input type="number" min={1} value={pageNumber} onChange={(event) => setPageNumber(Number(event.target.value) || 1)} /></label><button type="button" className="secondary-button pro-add-button" onClick={addBookmark}><FilePlus2 size={15} /> Adicionar marcador</button><ChipList values={bookmarks.map((bookmark) => `${bookmark.title} → pág. ${bookmark.page}`)} onRemove={(index) => setBookmarks((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></> : null}
      {tool.slug === "limpar-documento-digitalizado" ? <><Check checked={cleanDeskew} set={setCleanDeskew}>Endireitar inclinação automaticamente</Check><Check checked={cleanBlank} set={setCleanBlank}>Remover páginas praticamente em branco</Check><label><span>Força da limpeza</span><input type="range" min={0} max={3} step={1} value={cleanStrength} onChange={(event) => setCleanStrength(Number(event.target.value))} /></label><label><span>Rotação adicional</span><select value={cleanRotate} onChange={(event) => setCleanRotate(Number(event.target.value))}><option value={0}>Nenhuma</option><option value={90}>90°</option><option value={-90}>-90°</option><option value={180}>180°</option></select></label></> : null}
      {tool.slug === "otimizar-pdf-avancado" ? <><label><span>Modo</span><select value={optimizeMode} onChange={(event) => setOptimizeMode(event.target.value as "structural" | "visual")}><option value="structural">Estrutural — preserva texto/vetores</option><option value="visual">Visual — redução mais forte</option></select></label>{optimizeMode === "visual" ? <><label><span>Qualidade JPEG: {Math.round(quality * 100)}%</span><input type="range" min={.4} max={.95} step={.05} value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label><label><span>Resolução: {dpiScale.toFixed(2)}×</span><input type="range" min={.8} max={2} step={.1} value={dpiScale} onChange={(event) => setDpiScale(Number(event.target.value))} /></label></> : <><Check checked={removeMetadata} set={setRemoveMetadata}>Remover metadados</Check><Check checked={flattenForms} set={setFlattenForms}>Achatar formulários</Check></>}</> : null}
      {tool.slug === "otimizar-pdf-avancado" ? <Info title="Fast Web View"><>A saída é compactada e reorganizada localmente. Linearização PDF verdadeira (hint tables para streaming progressivo) exige um motor qpdf equivalente; o LIM PDF não marca o arquivo como linearizado quando isso não foi realmente produzido.</></Info> : null}
      {tool.slug === "processamento-lote-pdf" ? <label><span>Operação</span><select value={batchOperation} onChange={(event) => setBatchOperation(event.target.value as typeof batchOperation)}><option value="metadata">Remover metadados</option><option value="number">Numerar páginas</option><option value="confidential">Marcar CONFIDENCIAL</option><option value="structural">Normalizar/achatar formulários</option></select></label> : null}
      {tool.slug === "numeracao-bates" ? <><label><span>Prefixo</span><input value={batesPrefix} onChange={(event) => setBatesPrefix(event.target.value)} /></label><div className="pro-option-grid two"><label><span>Inicial</span><input type="number" min={0} value={batesStart} onChange={(event) => setBatesStart(Number(event.target.value) || 0)} /></label><label><span>Dígitos</span><input type="number" min={3} max={12} value={batesDigits} onChange={(event) => setBatesDigits(Math.max(3, Math.min(12, Number(event.target.value) || 6)))} /></label></div><label><span>Posição</span><select value={batesPosition} onChange={(event) => setBatesPosition(event.target.value as typeof batesPosition)}><option value="bottom-right">Inferior direita</option><option value="bottom-left">Inferior esquerda</option><option value="top-right">Superior direita</option><option value="top-left">Superior esquerda</option></select></label><div className="pro-preview-value">Exemplo: <strong>{batesPrefix}{String(batesStart).padStart(batesDigits, "0")}</strong></div></> : null}
      {tool.slug === "editar-metadados-pdf" ? <>{(["title", "author", "subject", "keywords", "creator", "producer"] as const).map((key) => <label key={key}><span>{{ title: "Título", author: "Autor", subject: "Assunto", keywords: "Palavras-chave", creator: "Criador", producer: "Produtor" }[key]}</span><input value={metadata[key] || ""} onChange={(event) => setMetadata((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</> : null}
      {tool.slug === "assinatura-digital-pdf" ? <><label><span>Certificado X.509 PEM</span><button type="button" className="secondary-button pro-file-button" onClick={() => certificateRef.current?.click()}>{certificateName || "Selecionar certificado"}</button><input ref={certificateRef} type="file" accept=".pem,.crt,.cer,text/plain" hidden onChange={(event) => void readTextFile(event.target.files, "certificate")} /></label><label><span>Chave RSA PKCS#8 PEM</span><button type="button" className="secondary-button pro-file-button" onClick={() => privateKeyRef.current?.click()}>{privateKeyName || "Selecionar chave privada"}</button><input ref={privateKeyRef} type="file" accept=".pem,.key,text/plain" hidden onChange={(event) => void readTextFile(event.target.files, "key")} /></label><label><span>Assinante</span><input value={signerName} onChange={(event) => setSignerName(event.target.value)} /></label><label><span>Motivo</span><input value={signReason} onChange={(event) => setSignReason(event.target.value)} /></label><Check checked={signVisible} set={setSignVisible}>Adicionar selo visual</Check><Info title="Chave não sai do navegador">O Web Crypto assina localmente e o PDF recebe um contêiner CMS destacado. Certificados A1 podem ser usados quando a chave/certificado estiverem disponíveis em PEM; tokens/cartões A3 exigem ponte nativa ou extensão porque páginas web comuns não recebem acesso direto ao dispositivo criptográfico.</Info></> : null}
      {tool.slug === "pdf-a" ? <Info title="Preparação PDF/A-2B">Normaliza XMP, formulário e metadados. A certificação ISO final depende de perfil ICC/fontes e deve ser confirmada por validador dedicado.</Info> : null}
      {["reparar-pdf", "pdf-para-powerpoint", "powerpoint-para-pdf", "extrair-imagens-pdf"].includes(tool.slug) ? <Info title="Configuração automática">A ferramenta analisa o documento e escolhe o fluxo local adequado.</Info> : null}
    </div>

    <div className="workflow-preview pro-workflow-preview"><span><ShieldCheck size={16} /> Privado no navegador</span><strong>{tool.name}</strong><small>{optionsSummary}</small></div>
    <button className="process-button" type="button" disabled={!ready || status.type === "processing"} onClick={() => void process()}>{status.type === "processing" ? <><LoaderCircle className="spin" size={18} /> {status.message || "Processando…"}</> : <>Processar agora</>}</button>
    {status.type === "processing" && typeof status.progress === "number" ? <div className="pro-progress"><i style={{ width: `${Math.max(2, Math.min(100, status.progress))}%` }} /><span>{Math.round(status.progress)}%</span></div> : null}
    {status.type !== "idle" && status.type !== "processing" ? <div className={`status-message ${status.type === "error" ? "error" : "success"}`}>{status.type === "success" ? <CheckCircle2 size={18} /> : null}<span>{status.message}</span></div> : null}
    {report.length ? <div className="pro-report"><strong>Relatório</strong>{report.map((item) => <span key={item}><CheckCircle2 size={14} /> {item}</span>)}</div> : null}
  </section>;
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="pro-info-card"><ShieldCheck size={17} /><span><strong>{title}</strong><small>{children}</small></span></div>;
}
function Check({ checked, set, children }: { checked: boolean; set: (value: boolean) => void; children: React.ReactNode }) {
  return <label className="pro-check"><input type="checkbox" checked={checked} onChange={(event) => set(event.target.checked)} /><span>{children}</span></label>;
}
function ChipList({ values, onRemove }: { values: string[]; onRemove: (index: number) => void }) {
  return <div className="pro-chip-list">{values.map((value, index) => <span key={`${value}-${index}`}>{value}<button type="button" aria-label={`Remover ${value}`} onClick={() => onRemove(index)}>×</button></span>)}</div>;
}
