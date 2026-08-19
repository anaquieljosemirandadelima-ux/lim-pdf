"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import { OutputActions } from "@/components/OutputActions";
import { createStoredZipFromBlobs, downloadBytes, humanSize, outputName, prepareOutput, type BlobZipEntry } from "@/lib/browser-files";
import { canvasToBlob, renderPdfPagesSequentially } from "@/lib/pdf-render";
import type { ToolDefinition } from "@/lib/tools";
import { useTemporaryFiles } from "@/lib/use-temporary-files";
import { formatFileSizeLimit, getFileSizeGuidance, isFileWithinLimit, isPdfFile, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";
import { chooseSmallestPdf, compressionReduction, getPdfCompressionPreset, PDF_COMPRESSION_PRESETS, type PdfCompressionPreset, type PdfCompressionStrategy } from "@/lib/pdf-compression";

type SupportedSlug = "pdf-para-jpg" | "pdf-para-png" | "compactar-pdf" | "pdf-em-escala-de-cinza";
type Status =
  | { type: "idle"; message?: string }
  | { type: "processing"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function isSupported(tool: ToolDefinition): tool is ToolDefinition & { slug: SupportedSlug } {
  return ["pdf-para-jpg", "pdf-para-png", "compactar-pdf", "pdf-em-escala-de-cinza"].includes(tool.slug);
}

export function MemorySafePdfWorkspace({ tool }: { tool: ToolDefinition }) {
  if (!isSupported(tool)) throw new Error(`Ferramenta não suportada pelo workspace sequencial: ${tool.slug}`);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [dragActive, setDragActive] = useState(false);
  const [renderResolution, setRenderResolution] = useState("1.5");
  const [compression, setCompression] = useState<PdfCompressionPreset>("recomendada");
  const { restored, cached, clearCache } = useTemporaryFiles(`tool:${tool.slug}`, files, setFiles);
  const file = files[0];
  const fileGuidance = file ? getFileSizeGuidance(file) : null;

  function addFile(nextFile: File) {
    if (!isPdfFile(nextFile)) {
      setStatus({ type: "error", message: "Selecione um arquivo PDF válido." });
      return;
    }
    if (!isFileWithinLimit(nextFile, MAX_LOCAL_PDF_BYTES)) {
      setStatus({ type: "error", message: `${nextFile.name} ultrapassa o limite de ${formatFileSizeLimit()}.` });
      return;
    }
    setFiles([nextFile]);
    setStatus({ type: "idle" });
  }

  function removeFile() {
    setFiles([]);
    clearCache();
    setStatus({ type: "idle" });
  }

  async function processImages(type: "image/jpeg" | "image/png") {
    if (!file) return;
    const requestedScale = Number(renderResolution);
    const extension = type === "image/jpeg" ? "jpg" : "png";
    const entries: BlobZipEntry[] = [];
    const sourceBytes = await file.arrayBuffer();

    await renderPdfPagesSequentially(sourceBytes, requestedScale, async (rendered, progress) => {
      setStatus({ type: "processing", message: `Convertendo página ${progress.pageNumber} de ${progress.totalPages}...` });
      const blob = await canvasToBlob(rendered.canvas, type, type === "image/jpeg" ? 0.9 : 1);
      entries.push({
        name: `${file.name.replace(/\.pdf$/i, "")}-pagina-${rendered.pageNumber}.${extension}`,
        data: blob,
      });
    });

    setStatus({ type: "processing", message: "Montando arquivo ZIP sem duplicar as imagens na memória..." });
    const zip = await createStoredZipFromBlobs(entries);
    prepareOutput(zip, `${file.name.replace(/\.pdf$/i, "")}-${extension}.zip`);
  }

  async function processRasterPdf(grayscale: boolean) {
    if (!file) throw new Error("Selecione um PDF antes de processar.");
    const pdfLib = await import("pdf-lib");
    const sourceBytes = await file.arrayBuffer();
    const input = new Uint8Array(sourceBytes.slice(0));
    const presetName = getPdfCompressionPreset(compression);
    const preset = PDF_COMPRESSION_PRESETS[presetName];

    if (grayscale) {
      const output = await pdfLib.PDFDocument.create();
      await renderPdfPagesSequentially(sourceBytes, preset.scale, async (rendered, progress) => {
        setStatus({ type: "processing", message: `Convertendo página ${progress.pageNumber} de ${progress.totalPages}...` });
        const blob = await canvasToBlob(rendered.canvas, "image/jpeg", 0.82);
        const image = await output.embedJpg(await blob.arrayBuffer());
        const width = rendered.width / rendered.scale;
        const height = rendered.height / rendered.scale;
        const page = output.addPage([width, height]);
        page.drawImage(image, { x: 0, y: 0, width, height });
      }, true);
      const bytes = await output.save({ useObjectStreams: true, objectsPerTick: 45 });
      downloadBytes(bytes, outputName(file, "escala-de-cinza"));
      return { strategy: "visual" as const, bytes, reduction: compressionReduction(input.length, bytes.length), inputSize: input.length, outputSize: bytes.length, preset: presetName };
    }

    const candidates: Array<{ strategy: PdfCompressionStrategy; bytes: Uint8Array }> = [];
    try {
      setStatus({ type: "processing", message: "Otimizando a estrutura sem rasterizar o documento..." });
      const structural = await pdfLib.PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false });
      const structuralBytes = await structural.save({ useObjectStreams: true, objectsPerTick: 45 });
      candidates.push({ strategy: "estrutural", bytes: structuralBytes });
    } catch {
      // PDFs protegidos ou com estrutura incomum continuam pelo caminho visual.
    }

    const visual = await pdfLib.PDFDocument.create();
    await renderPdfPagesSequentially(sourceBytes, preset.scale, async (rendered, progress) => {
      setStatus({ type: "processing", message: `Testando redução visual: página ${progress.pageNumber} de ${progress.totalPages}...` });
      const blob = await canvasToBlob(rendered.canvas, "image/jpeg", preset.quality);
      const image = await visual.embedJpg(await blob.arrayBuffer());
      const width = rendered.width / rendered.scale;
      const height = rendered.height / rendered.scale;
      const page = visual.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
    });
    candidates.push({ strategy: "visual", bytes: await visual.save({ useObjectStreams: true, objectsPerTick: 45 }) });

    const selected = chooseSmallestPdf(input, candidates);
    downloadBytes(selected.bytes, outputName(file, "compactado"));
    return { ...selected, inputSize: input.length, outputSize: selected.bytes.length, preset: presetName };
  }

  async function processNow() {
    if (!file || status.type === "processing") return;
    setStatus({ type: "processing", message: "Preparando processamento local..." });
    try {
      if (tool.slug === "pdf-para-jpg") await processImages("image/jpeg");
      else if (tool.slug === "pdf-para-png") await processImages("image/png");
      else {
        const result = await processRasterPdf(tool.slug === "pdf-em-escala-de-cinza");
        const reduction = compressionReduction(result.inputSize, result.outputSize);
        const strategyLabel = result.strategy === "estrutural" ? "estrutura preservada" : result.strategy === "visual" ? "redução visual" : "arquivo original preservado";
        setStatus({
          type: "success",
          message: tool.slug === "compactar-pdf"
            ? reduction > 0
              ? `PDF compactado: ${humanSize(result.inputSize)} → ${humanSize(result.outputSize)} (${reduction}% menor; ${strategyLabel}). ${result.strategy === "estrutural" ? "Texto, links e formulários foram mantidos." : "Nesta saída visual, elementos da página podem virar imagem e perder seleção."}`
              : "O PDF já estava otimizado; o arquivo original foi preservado para não aumentar o tamanho."
            : "Processamento concluído. Escolha imprimir no computador ou baixar o resultado.",
        });
      }
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível processar o PDF." });
    }
  }

  return (
    <section className="workspace" aria-labelledby="workspace-title">
      <div className="workspace-heading"><div><h2 id="workspace-title">Selecione o arquivo</h2><p>O processamento acontece localmente e uma página é liberada da memória antes da próxima ser renderizada.</p></div></div>

      {!file ? (
        <div
          className={`drop-zone ${dragActive ? "is-dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { event.preventDefault(); if (event.currentTarget === event.target) setDragActive(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) addFile(dropped);
          }}
        >
          <span className="drop-icon"><UploadCloud size={31} strokeWidth={1.7} aria-hidden="true" /></span>
          <strong>Arraste um PDF ou escolha no dispositivo</strong>
          <span>PDF · até {formatFileSizeLimit()} · processamento sequencial</span>
          <button type="button" className="primary-button" onClick={() => inputRef.current?.click()}>Selecionar arquivo</button>
          <input ref={inputRef} type="file" accept="application/pdf" hidden onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => event.target.files?.[0] && addFile(event.target.files[0])} />
        </div>
      ) : (
        <div className="selected-files">
          <div className="selected-files-title"><strong>1 arquivo selecionado</strong></div>
          <ol><li><span className="file-icon"><FileText size={20} /></span><span className="file-name"><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span><button type="button" className="remove-file" onClick={removeFile} aria-label={`Remover ${file.name}`}><Trash2 size={18} /></button></li></ol>
        </div>
      )}

      {fileGuidance && fileGuidance.tier !== "standard" ? <div className="large-file-notice" role="status"><FileText size={16} /><span><strong>{fileGuidance.tier === "very-large" ? "Arquivo muito grande" : "Arquivo grande"}</strong><small>{fileGuidance.message} As páginas são processadas uma a uma para reduzir o uso de memória.</small></span></div> : null}

      {file ? (
        <div className="tool-options options-grid">
          {(tool.slug === "pdf-para-jpg" || tool.slug === "pdf-para-png") ? (
            <label><span>Resolução</span><select value={renderResolution} onChange={(event) => setRenderResolution(event.target.value)}><option value="1">Normal</option><option value="1.5">Alta</option><option value="2">Muito alta</option></select><small>A resolução é reduzida automaticamente apenas quando uma página ultrapassaria o limite seguro de memória.</small></label>
          ) : (
            <label><span>{tool.slug === "compactar-pdf" ? "Nível de compactação" : "Qualidade de saída"}</span><select value={compression} onChange={(event) => setCompression(getPdfCompressionPreset(event.target.value))}><option value="alta">Alta qualidade</option><option value="recomendada">Recomendada</option><option value="maxima">Máxima redução</option></select><small>{PDF_COMPRESSION_PRESETS[compression].description}</small></label>
          )}
          {tool.slug === "compactar-pdf" ? <div className="option-full extraction-note"><strong>Compressão inteligente</strong><span>O LIM PDF compara uma otimização estrutural com uma versão visual e baixa a menor saída. Texto, links e formulários são mantidos quando isso gera o melhor resultado.</span></div> : null}
        </div>
      ) : null}

      {status.type !== "idle" ? <div className={`status-message status-${status.type}`} role="status">{status.type === "processing" ? <LoaderCircle className="spin" size={19} /> : null}{status.type === "success" ? <CheckCircle2 size={19} /> : null}{status.type === "error" ? <AlertCircle size={19} /> : null}<span>{status.message}</span></div> : null}

      <OutputActions />
      {file ? <button type="button" className="process-button" onClick={processNow} disabled={status.type === "processing"}>{status.type === "processing" ? <LoaderCircle className="spin" size={20} /> : <Download size={20} />}{status.type === "processing" ? "Processando..." : `${tool.name} agora`}</button> : null}
      <p className="privacy-note">Processamento local no navegador. {cached ? "Cache temporário ativo." : ""}{restored ? " Sessão restaurada." : ""}</p>
    </section>
  );
}
