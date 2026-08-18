import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { canvasToBlob, loadPdfJsDocument } from "@/lib/pdf-render";
import { createStoredZipFromBlobs } from "@/lib/browser-files";

export type OcrProgress = (message: string, percent?: number) => void;
export type OcrPreprocess = "automatic" | "original";

export type OcrSummary = {
  pages: number;
  recognizedWords: number;
  lowConfidenceWords: number;
  averageConfidence: number;
  pagesWithoutWords: number;
  preprocessed: boolean;
};

export type OcrResult = OcrSummary & {
  bytes: Uint8Array;
  filename: string;
};

export type OcrBatchResult = {
  blob: Blob;
  filename: string;
  count: number;
  summaries: OcrSummary[];
};

type TesseractMessage = { status?: string; progress?: number };
type TesseractResult = { data: { tsv?: string } };
type TesseractWorker = {
  recognize(image: HTMLCanvasElement, options?: Record<string, never>, output?: { text?: boolean; tsv?: boolean }): Promise<TesseractResult>;
  terminate(): Promise<void>;
};
type TesseractGlobal = {
  createWorker(languages: string, oem?: number, options?: { logger?: (message: TesseractMessage) => void }): Promise<TesseractWorker>;
};

declare global { interface Window { Tesseract?: TesseractGlobal } }

const MAX_RASTER_PIXELS = 18_000_000;
const MAX_TOTAL_RASTER_PIXELS = 120_000_000;
const MAX_BATCH_OUTPUT_BYTES = 700 * 1024 * 1024;
export const MAX_OCR_PAGES = 80;
export const OCR_MAX_BATCH_FILES = 20;
const MAX_CANVAS_SIDE = 8_192;
const MIN_USEFUL_SCALE = 0.1;
const TESSERACT_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";
let tesseractLoadPromise: Promise<void> | null = null;

type OcrWord = { text: string; left: number; top: number; width: number; height: number; confidence: number };

type OcrOptions = { preprocess?: OcrPreprocess };

function safeBaseName(file: File) { return file.name.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9._ -]+/g, "-").trim() || "documento"; }

function loadTesseract() {
  if (window.Tesseract?.createWorker) return Promise.resolve();
  if (tesseractLoadPromise) return tesseractLoadPromise;
  document.querySelectorAll<HTMLScriptElement>('script[data-limpdf-ocr]').forEach((script) => script.remove());
  tesseractLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TESSERACT_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.limpdfOcr = "loading";
    const fail = (message: string) => { script.dataset.limpdfOcr = "error"; script.remove(); tesseractLoadPromise = null; reject(new Error(message)); };
    script.addEventListener("load", () => {
      if (!window.Tesseract?.createWorker) { fail("O motor OCR foi carregado, mas não ficou disponível neste navegador."); return; }
      script.dataset.limpdfOcr = "loaded";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => fail("Não foi possível carregar o motor OCR. Verifique sua conexão e tente novamente."), { once: true });
    document.head.appendChild(script);
  });
  return tesseractLoadPromise;
}

async function createWorker(languages: string, progress?: OcrProgress) {
  await loadTesseract();
  if (!window.Tesseract?.createWorker) throw new Error("O motor OCR não ficou disponível neste navegador.");
  return window.Tesseract.createWorker(languages, 1, {
    logger: (message) => {
      const label = message.status === "recognizing text" ? "Reconhecendo texto" : message.status === "loading language traineddata" ? "Carregando idioma" : message.status || "Preparando OCR";
      progress?.(label);
    },
  });
}

function parseTsvWords(tsv: string) {
  const words: OcrWord[] = [];
  for (const line of tsv.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const columns = line.split("\t");
    if (columns.length < 12 || columns[0] !== "5") continue;
    const confidence = Number(columns[10]);
    const text = columns.slice(11).join("\t").trim();
    const left = Number(columns[6]);
    const top = Number(columns[7]);
    const width = Number(columns[8]);
    const height = Number(columns[9]);
    if (!text || !Number.isFinite(confidence) || !Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || confidence < 20) continue;
    words.push({ text, left, top, width, height, confidence });
  }
  return words;
}

function safeOcrScale(width: number, height: number) {
  const basePixels = Math.max(1, width * height);
  const pixelScale = Math.sqrt(MAX_RASTER_PIXELS / basePixels);
  const sideScale = Math.min(MAX_CANVAS_SIDE / Math.max(1, width), MAX_CANVAS_SIDE / Math.max(1, height));
  const scale = Math.min(2.2, pixelScale, sideScale);
  if (!Number.isFinite(scale) || scale < MIN_USEFUL_SCALE) throw new Error("Uma das páginas é grande demais para OCR seguro neste navegador. Redimensione a página e tente novamente.");
  return scale;
}

function preprocessCanvas(source: HTMLCanvasElement, mode: OcrPreprocess) {
  if (mode === "original") return source;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!context) throw new Error("Não foi possível preparar a página para OCR.");
  context.drawImage(source, 0, 0);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  let sampleCount = 0;
  let sum = 0;
  let sumSquares = 0;
  for (let index = 0; index < data.length; index += 4 * 16) {
    const gray = data[index] * .299 + data[index + 1] * .587 + data[index + 2] * .114;
    sum += gray;
    sumSquares += gray * gray;
    sampleCount += 1;
  }
  const mean = sum / Math.max(1, sampleCount);
  const deviation = Math.sqrt(Math.max(1, sumSquares / Math.max(1, sampleCount) - mean * mean));
  const low = Math.max(0, mean - Math.max(42, deviation * 2.1));
  const high = Math.min(255, mean + Math.max(42, deviation * 2.1));
  const range = Math.max(40, high - low);
  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * .299 + data[index + 1] * .587 + data[index + 2] * .114;
    const adjusted = Math.max(0, Math.min(255, ((gray - low) / range) * 255));
    const value = Math.round(adjusted < 34 ? 0 : adjusted > 244 ? 255 : adjusted);
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function summarizeWords(words: OcrWord[], pagesWithoutWords: number, pages: number, preprocessed: boolean): OcrSummary {
  const confidence = words.reduce((total, word) => total + word.confidence, 0);
  return {
    pages,
    recognizedWords: words.length,
    lowConfidenceWords: words.filter((word) => word.confidence < 60).length,
    averageConfidence: words.length ? Math.round(confidence / words.length) : 0,
    pagesWithoutWords,
    preprocessed,
  };
}

function idleYield() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

async function processOcrFile(file: File, worker: TesseractWorker, options: OcrOptions, progress?: OcrProgress): Promise<OcrResult> {
  const source = await loadPdfJsDocument(await file.arrayBuffer());
  if (source.numPages > MAX_OCR_PAGES) {
    await source.cleanup();
    throw new Error(`Este PDF tem ${source.numPages} páginas. Para manter o navegador estável, processe no máximo ${MAX_OCR_PAGES} páginas por vez.`);
  }
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const words: OcrWord[] = [];
  let pagesWithoutWords = 0;
  let totalRasterPixels = 0;
  const preprocessMode = options.preprocess || "automatic";

  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      progress?.(`OCR de ${file.name} · página ${pageNumber} de ${source.numPages}`, Math.round(((pageNumber - 1) / source.numPages) * 100));
      const sourcePage = await source.getPage(pageNumber);
      try {
        const base = sourcePage.getViewport({ scale: 1 });
        const scale = safeOcrScale(base.width, base.height);
        const viewport = sourcePage.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const pagePixels = canvas.width * canvas.height;
        if (pagePixels > MAX_RASTER_PIXELS + Math.max(canvas.width, canvas.height)) throw new Error("A página ultrapassa o limite seguro de pixels para OCR.");
        totalRasterPixels += pagePixels;
        if (totalRasterPixels > MAX_TOTAL_RASTER_PIXELS) throw new Error("Este documento exigiria memória demais para OCR em uma única execução. Divida o PDF em partes menores e tente novamente.");
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Não foi possível renderizar a página para OCR.");
        await sourcePage.render({ canvas, canvasContext: context, viewport }).promise;
        const ocrCanvas = preprocessCanvas(canvas, preprocessMode);
        const result = await worker.recognize(ocrCanvas, {}, { text: true, tsv: true });
        const pageWords = parseTsvWords(String(result.data.tsv || ""));
        if (!pageWords.length) pagesWithoutWords += 1;
        words.push(...pageWords);
        const imageBlob = await canvasToBlob(canvas, "image/jpeg", .92);
        const image = await output.embedJpg(await imageBlob.arrayBuffer());
        const page = output.addPage([base.width, base.height]);
        page.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
        for (const word of pageWords) {
          const x = word.left / scale;
          const height = Math.max(4, word.height / scale);
          const y = base.height - (word.top + word.height) / scale;
          const size = Math.max(4, Math.min(42, height * .82));
          try { page.drawText(word.text, { x, y, size, font, maxWidth: Math.max(4, word.width / scale + 4), opacity: .002, color: rgb(0, 0, 0) }); } catch { /* página visual permanece intacta */ }
        }
        if (ocrCanvas !== canvas) { ocrCanvas.width = 1; ocrCanvas.height = 1; }
        canvas.width = 1;
        canvas.height = 1;
        await idleYield();
      } finally { sourcePage.cleanup(); }
    }
    const summary = summarizeWords(words, pagesWithoutWords, source.numPages, preprocessMode === "automatic");
    progress?.(`PDF pesquisável concluído: ${file.name}`, 100);
    return { ...summary, bytes: await output.save({ useObjectStreams: true }), filename: `${safeBaseName(file)}-ocr.pdf` };
  } finally {
    await source.cleanup();
  }
}

export async function createSearchablePdf(file: File, languages: string, progress?: OcrProgress, options: OcrOptions = {}) {
  let worker: TesseractWorker | null = null;
  try {
    worker = await createWorker(languages, progress);
    return await processOcrFile(file, worker, options, progress);
  } finally {
    if (worker) await worker.terminate();
  }
}

export async function createSearchablePdfBatch(files: File[], languages: string, progress?: OcrProgress, options: OcrOptions = {}): Promise<OcrBatchResult> {
  if (!files.length) throw new Error("Selecione pelo menos um PDF.");
  if (files.length > OCR_MAX_BATCH_FILES) throw new Error(`Processe no máximo ${OCR_MAX_BATCH_FILES} PDFs por lote para manter o navegador estável.`);
  let worker: TesseractWorker | null = null;
  const entries: Array<{ name: string; data: Blob }> = [];
  const summaries: OcrSummary[] = [];
  const usedNames = new Set<string>();
  let outputBytes = 0;
  try {
    worker = await createWorker(languages, progress);
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      progress?.(`Preparando documento ${index + 1} de ${files.length}: ${file.name}`, Math.round((index / files.length) * 100));
      const result = await processOcrFile(file, worker, options, (message, pagePercent) => {
        const overall = ((index + (pagePercent || 0) / 100) / files.length) * 100;
        progress?.(message, Math.round(overall));
      });
      outputBytes += result.bytes.length;
      if (outputBytes > MAX_BATCH_OUTPUT_BYTES) throw new Error("A saída acumulada do lote ultrapassaria 700 MB. Divida os arquivos em dois lotes menores.");
      const nameBase = result.filename;
      let name = nameBase;
      let suffix = 2;
      while (usedNames.has(name)) { name = nameBase.replace(/\.pdf$/i, `-${suffix}.pdf`); suffix += 1; }
      usedNames.add(name);
      entries.push({ name, data: new Blob([Uint8Array.from(result.bytes).buffer], { type: "application/pdf" }) });
      summaries.push({ pages: result.pages, recognizedWords: result.recognizedWords, lowConfidenceWords: result.lowConfidenceWords, averageConfidence: result.averageConfidence, pagesWithoutWords: result.pagesWithoutWords, preprocessed: result.preprocessed });
    }
    progress?.("Montando ZIP dos PDFs pesquisáveis", 98);
    return { blob: await createStoredZipFromBlobs(entries), filename: "lim-pdf-ocr-lote.zip", count: entries.length, summaries };
  } finally {
    if (worker) await worker.terminate();
  }
}
