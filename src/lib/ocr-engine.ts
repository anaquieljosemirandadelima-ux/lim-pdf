import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { canvasToBlob, loadPdfJsDocument } from "@/lib/pdf-render";

export type OcrProgress = (message: string, percent?: number) => void;

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
const MAX_OCR_PAGES = 80;
const MAX_CANVAS_SIDE = 8_192;
const MIN_USEFUL_SCALE = 0.1;
const TESSERACT_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";
let tesseractLoadPromise: Promise<void> | null = null;

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
      progress?.(label, typeof message.progress === "number" ? Math.round(message.progress * 100) : undefined);
    },
  });
}

function parseTsvWords(tsv: string) {
  const words: Array<{ text: string; left: number; top: number; width: number; height: number }> = [];
  for (const line of tsv.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const columns = line.split("\t");
    if (columns.length < 12 || columns[0] !== "5") continue;
    const confidence = Number(columns[10]);
    const text = columns.slice(11).join("\t").trim();
    if (!text || !Number.isFinite(confidence) || confidence < 20) continue;
    words.push({ text, left: Number(columns[6]), top: Number(columns[7]), width: Number(columns[8]), height: Number(columns[9]) });
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

export async function createSearchablePdf(file: File, languages: string, progress?: OcrProgress) {
  const source = await loadPdfJsDocument(await file.arrayBuffer());
  if (source.numPages > MAX_OCR_PAGES) {
    await source.cleanup();
    throw new Error(`Este PDF tem ${source.numPages} páginas. Para manter o navegador estável, processe no máximo ${MAX_OCR_PAGES} páginas por vez.`);
  }
  let worker: TesseractWorker | null = null;
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  let recognizedWords = 0;
  let totalRasterPixels = 0;

  try {
    worker = await createWorker(languages, progress);
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      progress?.(`OCR da página ${pageNumber} de ${source.numPages}`, Math.round(((pageNumber - 1) / source.numPages) * 100));
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
        const result = await worker.recognize(canvas, {}, { text: true, tsv: true });
        const words = parseTsvWords(String(result.data.tsv || ""));
        recognizedWords += words.length;
        const imageBlob = await canvasToBlob(canvas, "image/jpeg", .92);
        const image = await output.embedJpg(await imageBlob.arrayBuffer());
        const page = output.addPage([base.width, base.height]);
        page.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
        for (const word of words) {
          const x = word.left / scale;
          const height = Math.max(4, word.height / scale);
          const y = base.height - (word.top + word.height) / scale;
          const size = Math.max(4, Math.min(42, height * .82));
          try { page.drawText(word.text, { x, y, size, font, maxWidth: Math.max(4, word.width / scale + 4), opacity: .002, color: rgb(0, 0, 0) }); } catch { /* página visual permanece intacta */ }
        }
        canvas.width = 1;
        canvas.height = 1;
      } finally { sourcePage.cleanup(); }
    }
    progress?.("Finalizando PDF pesquisável", 100);
    return { bytes: await output.save({ useObjectStreams: true }), filename: `${safeBaseName(file)}-ocr.pdf`, pages: source.numPages, recognizedWords };
  } finally {
    await source.cleanup();
    if (worker) await worker.terminate();
  }
}
