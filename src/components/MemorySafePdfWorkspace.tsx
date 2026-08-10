"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import { createStoredZipFromBlobs, downloadBlob, downloadBytes, humanSize, outputName, type BlobZipEntry } from "@/lib/browser-files";
import { canvasToBlob, renderPdfPagesSequentially } from "@/lib/pdf-render";
import type { ToolDefinition } from "@/lib/tools";
import { useTemporaryFiles } from "@/lib/use-temporary-files";

const MAX_FILE_SIZE = 60 * 1024 * 1024;

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
  const [compression, setCompression] = useState("equilibrada");
  const { restored, cached, clearCache } = useTemporaryFiles(`tool:${tool.slug}`, files, setFiles);
  const file = files[0];

  function addFile(nextFile: File) {
    if (nextFile.type !== "application/pdf") {
      setStatus({ type: "error", message: "Selecione um arquivo PDF válido." });
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setStatus({ type: "error", message: `${nextFile.name} ultrapassa o limite recomendado de 60 MB.` });
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
    downloadBlob(zip, `${file.name.replace(/\.pdf$/i, "")}-${extension}.zip`);
  }

  async function processRasterPdf(grayscale: boolean) {
    if (!file) return;
    const pdfLib = await import("pdf-lib");
    const presets = {
      leve: { scale: 1.65, quality: 0.84 },
      equilibrada: { scale: 1.35, quality: 0.7 },
      forte: { scale: 1.05, quality: 0.5 },
    } as const;
    const preset = presets[compression as keyof typeof presets] || presets.equilibrada;
    const output = await pdfLib.PDFDocument.create();
    const sourceBytes = await file.arrayBuffer();

    await renderPdfPagesSequentially(sourceBytes, preset.scale, async (rendered, progress) => {
      setStatus({ type: "processing", message: `${grayscale ? "Convertendo" : "Compactando"} página ${progress.pageNumber} de ${progress.totalPages}...` });
      const blob = await canvasToBlob(rendered.canvas, "image/jpeg", grayscale ? 0.82 : preset.quality);
      const image = await output.embedJpg(await blob.arrayBuffer());
      const width = rendered.width / rendered.scale;
      const height = rendered.height / rendered.scale;
      const page = output.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
    }, grayscale);

    const bytes = await output.save({ useObjectStreams: true });
    downloadBytes(bytes, outputName(file, grayscale ? "escala-de-cinza" : "compactado"));
  }

  async function processNow() {
    if (!file || status.type === "processing") return;
    setStatus({ type: "processing", message: "Preparando processamento local..." });
    try {
      if (tool.slug === "pdf-para-jpg") await processImages("image/jpeg");
      else if (tool.slug === "pdf-para-png") await processImages("image/png");
      else await processRasterPdf(tool.slug === "pdf-em-escala-de-cinza");
      setStatus({
        type: "success",
        message: tool.slug === "compactar-pdf"
          ? "PDF compactado. Este modo rasteriza as páginas e pode remover texto selecionável, links e formulários."
          : "Processamento concluído e download iniciado.",
      });
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
          <span>PDF · até 60 MB</span>
          <button type="button" className="primary-button" onClick={() => inputRef.current?.click()}>Selecionar arquivo</button>
          <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(event) => event.target.files?.[0] && addFile(event.target.files[0])} />
        </div>
      ) : (
        <div className="selected-files">
          <div className="selected-files-title"><strong>1 arquivo selecionado</strong></div>
          <ol><li><span className="file-icon"><FileText size={20} /></span><span className="file-name"><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span><button type="button" className="remove-file" onClick={removeFile} aria-label={`Remover ${file.name}`}><Trash2 size={18} /></button></li></ol>
        </div>
      )}

      {file ? (
        <div className="tool-options options-grid">
          {(tool.slug === "pdf-para-jpg" || tool.slug === "pdf-para-png") ? (
            <label><span>Resolução</span><select value={renderResolution} onChange={(event) => setRenderResolution(event.target.value)}><option value="1">Normal</option><option value="1.5">Alta</option><option value="2">Muito alta</option></select><small>A resolução é reduzida automaticamente apenas quando uma página ultrapassaria o limite seguro de memória.</small></label>
          ) : (
            <label><span>{tool.slug === "compactar-pdf" ? "Nível de compactação" : "Qualidade de saída"}</span><select value={compression} onChange={(event) => setCompression(event.target.value)}><option value="leve">Alta qualidade</option><option value="equilibrada">Equilibrada</option><option value="forte">Arquivo menor</option></select></label>
          )}
          {tool.slug === "compactar-pdf" ? <div className="option-full extraction-note"><strong>Compactação rasterizada</strong><span>Indicada para digitalizações. O resultado pode perder texto selecionável, links, camadas e campos de formulário.</span></div> : null}
        </div>
      ) : null}

      {status.type !== "idle" ? <div className={`status-message status-${status.type}`} role="status">{status.type === "processing" ? <LoaderCircle className="spin" size={19} /> : null}{status.type === "success" ? <CheckCircle2 size={19} /> : null}{status.type === "error" ? <AlertCircle size={19} /> : null}<span>{status.message}</span></div> : null}

      {file ? <button type="button" className="process-button" onClick={processNow} disabled={status.type === "processing"}>{status.type === "processing" ? <LoaderCircle className="spin" size={20} /> : <Download size={20} />}{status.type === "processing" ? "Processando..." : `${tool.name} agora`}</button> : null}
      <p className="privacy-note">Processamento local no navegador. {cached ? "Cache temporário ativo." : ""}{restored ? " Sessão restaurada." : ""}</p>
    </section>
  );
}
