/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFString,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { canvasToBlob, loadPdfJsDocument, renderPdfPagesSequentially } from "@/lib/pdf-render";
import { createStoredZip } from "@/lib/browser-files";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const latin1Decoder = new TextDecoder("latin1");
const MAX_RASTER_PIXELS = 18_000_000;
const TESSERACT_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";

type Progress = (message: string, percent?: number) => void;
export type FormFieldDraft = {
  type: "text" | "checkbox" | "radio" | "dropdown" | "list";
  name: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  options?: string[];
};
export type BookmarkDraft = { title: string; page: number };
export type MetadataDraft = { title?: string; author?: string; subject?: string; keywords?: string; creator?: string; producer?: string };

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "lim-pdf";
}

function baseName(file: File) {
  return safeName(file.name.replace(/\.[^.]+$/, ""));
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function readU16(data: Uint8Array, offset: number) {
  return data[offset] | (data[offset + 1] << 8);
}

function readU32(data: Uint8Array, offset: number) {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
}

async function inflateRaw(data: Uint8Array) {
  if (typeof DecompressionStream === "undefined") throw new Error("Este navegador não oferece descompactação ZIP necessária para PPTX.");
  const stream = new Blob([Uint8Array.from(data).buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZipEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let endOffset = -1;
  const lowerBound = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= lowerBound; offset -= 1) {
    if (readU32(bytes, offset) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error("Arquivo ZIP/Office inválido ou corrompido.");
  const entryCount = readU16(bytes, endOffset + 10);
  let cursor = readU32(bytes, endOffset + 16);
  const entries = new Map<string, Uint8Array>();
  for (let index = 0; index < entryCount; index += 1) {
    if (readU32(bytes, cursor) !== 0x02014b50) throw new Error("Estrutura ZIP inválida.");
    const method = readU16(bytes, cursor + 10);
    const compressedSize = readU32(bytes, cursor + 20);
    const fileNameLength = readU16(bytes, cursor + 28);
    const extraLength = readU16(bytes, cursor + 30);
    const commentLength = readU16(bytes, cursor + 32);
    const localOffset = readU32(bytes, cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + fileNameLength));
    if (readU32(bytes, localOffset) !== 0x04034b50) throw new Error("Entrada ZIP inválida.");
    const localNameLength = readU16(bytes, localOffset + 26);
    const localExtraLength = readU16(bytes, localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (content) entries.set(name, content);
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function scriptPromise(src: string) {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-limpdf-engine="${src}"]`);
  if (existing?.dataset.ready === "1") return Promise.resolve();
  if (existing) return new Promise<void>((resolve, reject) => {
    existing.addEventListener("load", () => resolve(), { once: true });
    existing.addEventListener("error", () => reject(new Error("Falha ao carregar motor externo.")), { once: true });
  });
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.limpdfEngine = src;
    script.addEventListener("load", () => { script.dataset.ready = "1"; resolve(); }, { once: true });
    script.addEventListener("error", () => reject(new Error("Não foi possível carregar o motor OCR.")), { once: true });
    document.head.appendChild(script);
  });
}

async function createTesseractWorker(languages: string, onProgress?: Progress) {
  await scriptPromise(TESSERACT_SRC);
  const tesseract = (window as any).Tesseract;
  if (!tesseract?.createWorker) throw new Error("O motor OCR não ficou disponível no navegador.");
  return tesseract.createWorker(languages, 1, {
    logger: (message: { status?: string; progress?: number }) => {
      const label = message.status === "recognizing text" ? "Reconhecendo texto" : message.status === "loading language traineddata" ? "Carregando idioma" : message.status || "Preparando OCR";
      onProgress?.(label, typeof message.progress === "number" ? Math.round(message.progress * 100) : undefined);
    },
  });
}

function parseTsvWords(tsv: string) {
  const lines = tsv.split(/\r?\n/).slice(1);
  const words: Array<{ text: string; left: number; top: number; width: number; height: number; confidence: number }> = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const columns = line.split("\t");
    if (columns.length < 12 || columns[0] !== "5") continue;
    const text = columns.slice(11).join("\t").trim();
    const confidence = Number(columns[10]);
    if (!text || !Number.isFinite(confidence) || confidence < 20) continue;
    words.push({ text, left: Number(columns[6]), top: Number(columns[7]), width: Number(columns[8]), height: Number(columns[9]), confidence });
  }
  return words;
}

export async function ocrPdf(file: File, languages: string, onProgress?: Progress) {
  const worker = await createTesseractWorker(languages, onProgress);
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const source = await loadPdfJsDocument(await file.arrayBuffer());
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`OCR da página ${pageNumber} de ${source.numPages}`, Math.round(((pageNumber - 1) / source.numPages) * 100));
      const sourcePage = await source.getPage(pageNumber);
      try {
        const base = sourcePage.getViewport({ scale: 1 });
        const scale = Math.min(2.2, Math.max(1.4, Math.sqrt(MAX_RASTER_PIXELS / Math.max(1, base.width * base.height))));
        const viewport = sourcePage.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Não foi possível renderizar a página para OCR.");
        await sourcePage.render({ canvas, canvasContext: context, viewport }).promise;
        const recognized = await worker.recognize(canvas, {}, { text: true, tsv: true });
        const words = parseTsvWords(String(recognized.data.tsv || ""));
        const imageBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);
        const image = await output.embedJpg(await imageBlob.arrayBuffer());
        const page = output.addPage([base.width, base.height]);
        page.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
        for (const word of words) {
          const x = word.left / scale;
          const height = Math.max(4, word.height / scale);
          const y = base.height - (word.top + word.height) / scale;
          const size = Math.max(4, Math.min(42, height * 0.82));
          const maxWidth = Math.max(4, word.width / scale + 4);
          try {
            page.drawText(word.text, { x, y, size, font, maxWidth, opacity: 0.002, color: rgb(0, 0, 0) });
          } catch {
            // Caracteres fora de WinAnsi podem falhar na Helvetica padrão; a imagem original continua preservada.
          }
        }
        canvas.width = 1; canvas.height = 1;
      } finally {
        sourcePage.cleanup();
      }
    }
    const bytes = await output.save({ useObjectStreams: true });
    return { bytes, filename: `${baseName(file)}-ocr.pdf` };
  } finally {
    await source.cleanup();
    await worker.terminate();
  }
}

async function renderPageToCanvas(documentPdf: any, pageNumber: number, targetWidth?: number, targetHeight?: number) {
  if (pageNumber > documentPdf.numPages) {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth || 1000; canvas.height = targetHeight || 1400;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    return { canvas, baseWidth: canvas.width, baseHeight: canvas.height, scale: 1 };
  }
  const page = await documentPdf.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1.6, Math.max(0.8, Math.sqrt(4_000_000 / Math.max(1, base.width * base.height))));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth || Math.ceil(viewport.width);
    canvas.height = targetHeight || Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false })!;
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    if (targetWidth && targetHeight) {
      const temp = document.createElement("canvas"); temp.width = Math.ceil(viewport.width); temp.height = Math.ceil(viewport.height);
      const tempCtx = temp.getContext("2d", { alpha: false })!;
      await page.render({ canvas: temp, canvasContext: tempCtx, viewport }).promise;
      context.drawImage(temp, 0, 0, canvas.width, canvas.height);
      temp.width = 1; temp.height = 1;
    } else {
      await page.render({ canvas, canvasContext: context, viewport }).promise;
    }
    return { canvas, baseWidth: base.width, baseHeight: base.height, scale };
  } finally {
    page.cleanup();
  }
}

export async function comparePdfs(first: File, second: File, threshold = 32, onProgress?: Progress) {
  const a = await loadPdfJsDocument(await first.arrayBuffer());
  const b = await loadPdfJsDocument(await second.arrayBuffer());
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.HelveticaBold);
  try {
    const total = Math.max(a.numPages, b.numPages);
    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      onProgress?.(`Comparando página ${pageNumber} de ${total}`, Math.round(((pageNumber - 1) / total) * 100));
      const left = await renderPageToCanvas(a, pageNumber);
      const right = await renderPageToCanvas(b, pageNumber, left.canvas.width, left.canvas.height);
      const diff = document.createElement("canvas"); diff.width = left.canvas.width; diff.height = left.canvas.height;
      const diffCtx = diff.getContext("2d")!;
      const leftData = left.canvas.getContext("2d")!.getImageData(0, 0, diff.width, diff.height);
      const rightData = right.canvas.getContext("2d")!.getImageData(0, 0, diff.width, diff.height);
      const out = diffCtx.createImageData(diff.width, diff.height);
      let changed = 0;
      for (let i = 0; i < out.data.length; i += 4) {
        const delta = Math.abs(leftData.data[i] - rightData.data[i]) + Math.abs(leftData.data[i + 1] - rightData.data[i + 1]) + Math.abs(leftData.data[i + 2] - rightData.data[i + 2]);
        if (delta > threshold * 3) { out.data[i] = 239; out.data[i + 1] = 16; out.data[i + 2] = 16; out.data[i + 3] = 120; changed += 1; }
      }
      diffCtx.putImageData(out, 0, 0);
      const [leftBlob, rightBlob, diffBlob] = await Promise.all([canvasToBlob(left.canvas, "image/jpeg", 0.84), canvasToBlob(right.canvas, "image/jpeg", 0.84), canvasToBlob(diff, "image/png")]);
      const [leftImg, rightImg, diffImg] = await Promise.all([output.embedJpg(await leftBlob.arrayBuffer()), output.embedJpg(await rightBlob.arrayBuffer()), output.embedPng(await diffBlob.arrayBuffer())]);
      const w = left.baseWidth; const h = left.baseHeight; const gap = 18; const header = 30;
      const page = output.addPage([w * 2 + gap, h + header]);
      page.drawText(`Original A — página ${pageNumber}`, { x: 8, y: h + 10, size: 9, font, color: rgb(0.2, 0.25, 0.32) });
      page.drawText(`Original B + diferenças — ${changed.toLocaleString("pt-BR")} pixels`, { x: w + gap + 8, y: h + 10, size: 9, font, color: rgb(0.75, 0.08, 0.08) });
      page.drawImage(leftImg, { x: 0, y: 0, width: w, height: h });
      page.drawImage(rightImg, { x: w + gap, y: 0, width: w, height: h });
      page.drawImage(diffImg, { x: w + gap, y: 0, width: w, height: h });
      left.canvas.width = 1; right.canvas.width = 1; diff.width = 1;
    }
    return { bytes: await output.save({ useObjectStreams: true }), filename: `${baseName(first)}-comparado.pdf` };
  } finally {
    await a.cleanup(); await b.cleanup();
  }
}

export async function repairPdf(file: File, onProgress?: Progress) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    onProgress?.("Normalizando objetos e referências", 20);
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    pdf.setProducer("LIM PDF — reparação estrutural");
    return { bytes: await pdf.save({ useObjectStreams: true, addDefaultPage: false }), filename: `${baseName(file)}-reparado.pdf`, mode: "estrutura" };
  } catch {
    onProgress?.("Estrutura inválida. Tentando reconstrução visual", 35);
  }
  const source = await loadPdfJsDocument(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const output = await PDFDocument.create();
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Recuperando página ${pageNumber} de ${source.numPages}`, 35 + Math.round((pageNumber / source.numPages) * 60));
      const rendered = await renderPageToCanvas(source, pageNumber);
      const blob = await canvasToBlob(rendered.canvas, "image/jpeg", 0.9);
      const image = await output.embedJpg(await blob.arrayBuffer());
      const page = output.addPage([rendered.baseWidth, rendered.baseHeight]);
      page.drawImage(image, { x: 0, y: 0, width: rendered.baseWidth, height: rendered.baseHeight });
      rendered.canvas.width = 1;
    }
    return { bytes: await output.save(), filename: `${baseName(file)}-recuperado.pdf`, mode: "visual" };
  } finally {
    await source.cleanup();
  }
}

function imageObjectToCanvas(image: any) {
  const canvas = document.createElement("canvas");
  const width = Number(image.width || image.bitmap?.width || 0); const height = Number(image.height || image.bitmap?.height || 0);
  if (!width || !height) throw new Error("Imagem incorporada sem dimensões válidas.");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true })!;
  if (image.bitmap) { ctx.drawImage(image.bitmap, 0, 0, width, height); return canvas; }
  const data = image.data as Uint8Array | Uint8ClampedArray | undefined;
  if (!data) throw new Error("Imagem incorporada não expôs pixels.");
  const rgba = new Uint8ClampedArray(width * height * 4);
  if (data.length === rgba.length) rgba.set(data);
  else if (data.length === width * height * 3) {
    for (let src = 0, dst = 0; src < data.length; src += 3, dst += 4) { rgba[dst] = data[src]; rgba[dst + 1] = data[src + 1]; rgba[dst + 2] = data[src + 2]; rgba[dst + 3] = 255; }
  } else if (data.length === width * height) {
    for (let src = 0, dst = 0; src < data.length; src += 1, dst += 4) { rgba[dst] = rgba[dst + 1] = rgba[dst + 2] = data[src]; rgba[dst + 3] = 255; }
  } else throw new Error("Formato interno de imagem não suportado.");
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas;
}

export async function extractEmbeddedImages(file: File, onProgress?: Progress) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const source = await loadPdfJsDocument(await file.arrayBuffer());
  const entries: { name: string; data: Uint8Array }[] = [];
  const seen = new Set<string>();
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Analisando imagens da página ${pageNumber}`, Math.round(((pageNumber - 1) / source.numPages) * 100));
      const page = await source.getPage(pageNumber);
      try {
        const ops = await page.getOperatorList();
        const names: string[] = [];
        for (let index = 0; index < ops.fnArray.length; index += 1) {
          if (ops.fnArray[index] === pdfjs.OPS.paintImageXObject || ops.fnArray[index] === pdfjs.OPS.paintJpegXObject) {
            const name = String(ops.argsArray[index]?.[0] || "");
            if (name && !names.includes(name)) names.push(name);
          }
        }
        for (const name of names) {
          const key = `${pageNumber}:${name}`;
          if (seen.has(key)) continue; seen.add(key);
          const image = await new Promise<any>((resolve, reject) => {
            let done = false;
            const timer = window.setTimeout(() => { if (!done) reject(new Error("Tempo esgotado ao ler imagem.")); }, 3000);
            try {
              page.objs.get(name, (value: any) => { done = true; window.clearTimeout(timer); resolve(value); });
            } catch (error) { window.clearTimeout(timer); reject(error); }
          }).catch(() => null);
          if (!image) continue;
          try {
            const canvas = imageObjectToCanvas(image);
            const blob = await canvasToBlob(canvas, "image/png");
            entries.push({ name: `pagina-${String(pageNumber).padStart(3, "0")}-imagem-${String(entries.length + 1).padStart(3, "0")}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
            canvas.width = 1;
          } catch { /* continua para a próxima imagem */ }
        }
      } finally { page.cleanup(); }
    }
  } finally { await source.cleanup(); }
  if (!entries.length) throw new Error("Nenhuma imagem raster incorporada pôde ser extraída. O documento pode usar vetores ou imagens internas não expostas pelo leitor.");
  return { blob: createStoredZip(entries), filename: `${baseName(file)}-imagens.zip`, count: entries.length };
}

function estimateSkew(image: ImageData, width: number, height: number) {
  const step = Math.max(2, Math.floor(Math.max(width, height) / 1200));
  const samples: Array<[number, number]> = [];
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4;
    const gray = image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114;
    if (gray < 120) samples.push([x, y]);
  }
  if (samples.length < 100) return 0;
  let bestAngle = 0; let bestScore = -Infinity;
  for (let angle = -4; angle <= 4.001; angle += 0.5) {
    const tan = Math.tan((angle * Math.PI) / 180);
    const bins = new Map<number, number>();
    for (const [x, y] of samples) {
      const key = Math.round((y + tan * x) / 3);
      bins.set(key, (bins.get(key) || 0) + 1);
    }
    let score = 0;
    for (const count of bins.values()) score += count * count;
    if (score > bestScore) { bestScore = score; bestAngle = angle; }
  }
  return Math.abs(bestAngle) < 0.4 ? 0 : bestAngle;
}

function rotateCanvas(source: HTMLCanvasElement, degreesValue: number) {
  if (Math.abs(degreesValue) < 0.01) return source;
  const radians = (degreesValue * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians)); const cos = Math.abs(Math.cos(radians));
  const width = Math.ceil(source.width * cos + source.height * sin); const height = Math.ceil(source.width * sin + source.height * cos);
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false })!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2, height / 2); ctx.rotate(radians); ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function cleanCanvas(canvas: HTMLCanvasElement, strength: number) {
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true })!;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data; let dark = 0;
  const low = 110 + strength * 20; const high = 235 - strength * 12;
  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    if (gray > high) gray = 255;
    else if (gray < low) gray = Math.max(0, gray * (0.72 - strength * 0.08));
    else gray = 255 * Math.pow(gray / 255, 0.75 - strength * 0.08);
    if (gray < 210) dark += 1;
    const value = Math.max(0, Math.min(255, Math.round(gray)));
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(image, 0, 0);
  return dark / Math.max(1, canvas.width * canvas.height);
}

export async function cleanScannedPdf(file: File, options: { deskew: boolean; removeBlank: boolean; strength: number; rotate: number }, onProgress?: Progress) {
  const source = await loadPdfJsDocument(await file.arrayBuffer());
  const output = await PDFDocument.create();
  let removed = 0;
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Limpando página ${pageNumber} de ${source.numPages}`, Math.round(((pageNumber - 1) / source.numPages) * 100));
      const rendered = await renderPageToCanvas(source, pageNumber);
      let canvas = rendered.canvas;
      if (options.deskew) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const skew = estimateSkew(ctx.getImageData(0, 0, canvas.width, canvas.height), canvas.width, canvas.height);
        if (skew) { const rotated = rotateCanvas(canvas, skew); if (rotated !== canvas) { canvas.width = 1; canvas = rotated; } }
      }
      if (options.rotate) { const rotated = rotateCanvas(canvas, options.rotate); if (rotated !== canvas) { canvas.width = 1; canvas = rotated; } }
      const density = cleanCanvas(canvas, options.strength);
      if (options.removeBlank && density < 0.0018 && source.numPages - removed > 1) { removed += 1; canvas.width = 1; continue; }
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
      const image = await output.embedJpg(await blob.arrayBuffer());
      const ratio = canvas.width / canvas.height;
      const baseHeight = rendered.baseHeight; const baseWidth = baseHeight * ratio;
      const page = output.addPage([baseWidth, baseHeight]);
      page.drawImage(image, { x: 0, y: 0, width: baseWidth, height: baseHeight });
      canvas.width = 1;
    }
    return { bytes: await output.save(), filename: `${baseName(file)}-limpo.pdf`, removed };
  } finally { await source.cleanup(); }
}

export async function optimizePdfAdvanced(file: File, options: { mode: "structural" | "visual"; quality: number; dpiScale: number; removeMetadata: boolean; flattenForms: boolean }, onProgress?: Progress) {
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  if (options.mode === "structural") {
    onProgress?.("Regravando estrutura e recursos", 35);
    const pdf = await PDFDocument.load(inputBytes, { ignoreEncryption: true, updateMetadata: false });
    if (options.flattenForms) { try { pdf.getForm().flatten(); } catch { /* sem formulário */ } }
    if (options.removeMetadata) {
      pdf.setTitle(""); pdf.setAuthor(""); pdf.setSubject(""); pdf.setKeywords([]); pdf.setCreator("LIM PDF"); pdf.setProducer("LIM PDF");
    }
    return { bytes: await pdf.save({ useObjectStreams: true, objectsPerTick: 40 }), filename: `${baseName(file)}-otimizado.pdf`, mode: "estrutural" };
  }
  const output = await PDFDocument.create();
  let pageIndex = 0;
  await renderPdfPagesSequentially(inputBytes.buffer.slice(inputBytes.byteOffset, inputBytes.byteOffset + inputBytes.byteLength), options.dpiScale, async ({ canvas, scale }, progress) => {
    pageIndex += 1; onProgress?.(`Comprimindo página ${pageIndex} de ${progress.totalPages}`, Math.round((pageIndex / progress.totalPages) * 90));
    const blob = await canvasToBlob(canvas, "image/jpeg", options.quality);
    const image = await output.embedJpg(await blob.arrayBuffer());
    const page = output.addPage([canvas.width / scale, canvas.height / scale]);
    page.drawImage(image, { x: 0, y: 0, width: canvas.width / scale, height: canvas.height / scale });
  });
  return { bytes: await output.save({ useObjectStreams: true }), filename: `${baseName(file)}-otimizado-visual.pdf`, mode: "visual" };
}

function ensureHttpsUrl(raw: string) {
  const url = new URL(raw);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Use um endereço http:// ou https://.");
  return url.toString();
}

export async function addHyperlink(file: File, options: { url: string; page: number; x: number; y: number; width: number; height: number }) {
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const pages = pdf.getPages(); const page = pages[options.page - 1];
  if (!page) throw new Error("Página inválida.");
  const ctx = pdf.context; const action = PDFDict.withContext(ctx);
  action.set(PDFName.of("S"), PDFName.of("URI")); action.set(PDFName.of("URI"), PDFString.of(ensureHttpsUrl(options.url)));
  const annotation = PDFDict.withContext(ctx);
  annotation.set(PDFName.of("Type"), PDFName.of("Annot")); annotation.set(PDFName.of("Subtype"), PDFName.of("Link"));
  annotation.set(PDFName.of("Rect"), ctx.obj([options.x, options.y, options.x + options.width, options.y + options.height]) as PDFArray);
  annotation.set(PDFName.of("Border"), ctx.obj([0, 0, 0]) as PDFArray); annotation.set(PDFName.of("A"), ctx.register(action));
  page.node.addAnnot(ctx.register(annotation));
  return { bytes: await pdf.save(), filename: `${baseName(file)}-com-link.pdf` };
}

export async function addNativeAnnotation(file: File, options: { type: "note" | "highlight"; page: number; x: number; y: number; width: number; height: number; text: string }) {
  const pdf = await PDFDocument.load(await file.arrayBuffer()); const page = pdf.getPages()[options.page - 1];
  if (!page) throw new Error("Página inválida."); const ctx = pdf.context; const annotation = PDFDict.withContext(ctx);
  annotation.set(PDFName.of("Type"), PDFName.of("Annot"));
  annotation.set(PDFName.of("Subtype"), PDFName.of(options.type === "note" ? "Text" : "Highlight"));
  annotation.set(PDFName.of("Rect"), ctx.obj([options.x, options.y, options.x + options.width, options.y + options.height]) as PDFArray);
  annotation.set(PDFName.of("Contents"), PDFHexString.fromText(options.text || "Anotação LIM PDF"));
  annotation.set(PDFName.of("C"), ctx.obj(options.type === "note" ? [1, 0.78, 0.2] : [1, 0.9, 0.2]) as PDFArray);
  if (options.type === "highlight") {
    annotation.set(PDFName.of("QuadPoints"), ctx.obj([options.x, options.y + options.height, options.x + options.width, options.y + options.height, options.x, options.y, options.x + options.width, options.y]) as PDFArray);
  } else annotation.set(PDFName.of("Name"), PDFName.of("Comment"));
  page.node.addAnnot(ctx.register(annotation));
  return { bytes: await pdf.save(), filename: `${baseName(file)}-anotado.pdf` };
}

export async function createFormPdf(file: File, fields: FormFieldDraft[]) {
  if (!fields.length) throw new Error("Adicione pelo menos um campo.");
  const pdf = await PDFDocument.load(await file.arrayBuffer()); const form = pdf.getForm(); const pages = pdf.getPages();
  for (const draft of fields) {
    const page = pages[draft.page - 1]; if (!page) throw new Error(`Página ${draft.page} não existe.`);
    const opts = { x: draft.x, y: draft.y, width: draft.width, height: draft.height, borderWidth: 1, textColor: rgb(0.08, 0.1, 0.15), borderColor: rgb(0.65, 0.68, 0.74), backgroundColor: rgb(1, 1, 1) };
    if (draft.type === "text") form.createTextField(draft.name).addToPage(page, opts);
    if (draft.type === "checkbox") form.createCheckBox(draft.name).addToPage(page, opts);
    if (draft.type === "dropdown") { const field = form.createDropdown(draft.name); field.addOptions(draft.options?.length ? draft.options : ["Opção 1", "Opção 2"]); field.addToPage(page, opts); }
    if (draft.type === "list") { const field = form.createOptionList(draft.name); field.addOptions(draft.options?.length ? draft.options : ["Opção 1", "Opção 2"]); field.addToPage(page, opts); }
    if (draft.type === "radio") { const field = form.createRadioGroup(draft.name); const options = draft.options?.length ? draft.options : ["Sim", "Não"]; options.forEach((option, index) => field.addOptionToPage(option, page, { ...opts, x: draft.x + index * (draft.width + 12), width: draft.width, height: draft.height })); }
  }
  return { bytes: await pdf.save(), filename: `${baseName(file)}-formulario.pdf` };
}

export async function addBookmarks(file: File, bookmarks: BookmarkDraft[]) {
  if (!bookmarks.length) throw new Error("Adicione pelo menos um marcador.");
  const pdf = await PDFDocument.load(await file.arrayBuffer()); const pages = pdf.getPages(); const ctx = pdf.context;
  const root = PDFDict.withContext(ctx); root.set(PDFName.of("Type"), PDFName.of("Outlines")); const rootRef = ctx.register(root);
  const refs: any[] = []; const dicts: PDFDict[] = [];
  for (const bookmark of bookmarks) {
    const page = pages[bookmark.page - 1]; if (!page) throw new Error(`Página ${bookmark.page} não existe.`);
    const dict = PDFDict.withContext(ctx); dict.set(PDFName.of("Title"), PDFHexString.fromText(bookmark.title)); dict.set(PDFName.of("Parent"), rootRef);
    dict.set(PDFName.of("Dest"), ctx.obj([page.ref, PDFName.of("Fit")]) as PDFArray); dicts.push(dict); refs.push(ctx.register(dict));
  }
  dicts.forEach((dict, index) => { if (index > 0) dict.set(PDFName.of("Prev"), refs[index - 1]); if (index < refs.length - 1) dict.set(PDFName.of("Next"), refs[index + 1]); });
  root.set(PDFName.of("First"), refs[0]); root.set(PDFName.of("Last"), refs[refs.length - 1]); root.set(PDFName.of("Count"), PDFNumber.of(refs.length));
  pdf.catalog.set(PDFName.of("Outlines"), rootRef); pdf.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
  return { bytes: await pdf.save(), filename: `${baseName(file)}-marcadores.pdf` };
}

export async function addBates(file: File, options: { prefix: string; start: number; digits: number; position: "bottom-right" | "bottom-left" | "top-right" | "top-left" }) {
  const pdf = await PDFDocument.load(await file.arrayBuffer()); const font = await pdf.embedFont(StandardFonts.HelveticaBold); const pages = pdf.getPages();
  pages.forEach((page, index) => {
    const label = `${options.prefix}${String(options.start + index).padStart(options.digits, "0")}`; const size = 9; const width = font.widthOfTextAtSize(label, size); const margin = 22;
    const x = options.position.endsWith("right") ? page.getWidth() - width - margin : margin; const y = options.position.startsWith("top") ? page.getHeight() - margin - size : margin;
    page.drawText(label, { x, y, size, font, color: rgb(0.18, 0.2, 0.24) });
  });
  return { bytes: await pdf.save(), filename: `${baseName(file)}-bates.pdf` };
}

export async function editMetadata(file: File, metadata: MetadataDraft) {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  if (metadata.title !== undefined) pdf.setTitle(metadata.title); if (metadata.author !== undefined) pdf.setAuthor(metadata.author); if (metadata.subject !== undefined) pdf.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) pdf.setKeywords(metadata.keywords.split(",").map((value) => value.trim()).filter(Boolean)); if (metadata.creator !== undefined) pdf.setCreator(metadata.creator); if (metadata.producer !== undefined) pdf.setProducer(metadata.producer);
  pdf.setModificationDate(new Date());
  return { bytes: await pdf.save(), filename: `${baseName(file)}-metadados.pdf` };
}

export async function readMetadata(file: File) {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false, ignoreEncryption: true });
  return { title: pdf.getTitle() || "", author: pdf.getAuthor() || "", subject: pdf.getSubject() || "", keywords: pdf.getKeywords() || "", creator: pdf.getCreator() || "", producer: pdf.getProducer() || "" };
}

function xmpEscape(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export async function preparePdfA(file: File) {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false, ignoreEncryption: true });
  try { pdf.getForm().flatten(); } catch { /* sem campos */ }
  const now = new Date(); const title = pdf.getTitle() || file.name; pdf.setTitle(title); pdf.setProducer("LIM PDF PDF/A preparation"); pdf.setCreator("LIM PDF"); pdf.setModificationDate(now); if (!pdf.getCreationDate()) pdf.setCreationDate(now);
  const date = now.toISOString();
  const xmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" pdfaid:part="2" pdfaid:conformance="B"/><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmpEscape(title)}</rdf:li></rdf:Alt></dc:title><xmp:ModifyDate>${date}</xmp:ModifyDate><pdf:Producer>LIM PDF PDF/A preparation</pdf:Producer></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  const stream = pdf.context.flateStream(encoder.encode(xmp), { Type: "Metadata", Subtype: "XML" }); const streamRef = pdf.context.register(stream); pdf.catalog.set(PDFName.of("Metadata"), streamRef);
  pdf.catalog.set(PDFName.of("Lang"), PDFString.of("pt-BR")); pdf.catalog.set(PDFName.of("MarkInfo"), pdf.context.obj({ Marked: true }));
  return { bytes: await pdf.save({ useObjectStreams: false }), filename: `${baseName(file)}-pdfa-preparado.pdf`, report: ["XMP PDF/A-2B inserido", "Formulários achatados quando presentes", "Metadados normalizados", "Arquivo salvo sem criptografia", "Validação externa de ICC/fontes continua necessária para comprovação ISO 19005"] };
}

function pptxXmlEscape(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function minimalTheme() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="LIM PDF"><a:themeElements><a:clrScheme name="LIM"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F2937"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="EF1010"/></a:accent1><a:accent2><a:srgbClr val="2563EB"/></a:accent2><a:accent3><a:srgbClr val="16A34A"/></a:accent3><a:accent4><a:srgbClr val="7C3AED"/></a:accent4><a:accent5><a:srgbClr val="F59E0B"/></a:accent5><a:accent6><a:srgbClr val="0D9488"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="LIM"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme><a:fmtScheme name="LIM"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
}

export async function pdfToPptx(file: File, onProgress?: Progress) {
  const images: Uint8Array[] = []; let width = 9144000; let height = 6858000;
  const source = await loadPdfJsDocument(await file.arrayBuffer());
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Criando slide ${pageNumber} de ${source.numPages}`, Math.round(((pageNumber - 1) / source.numPages) * 90));
      const rendered = await renderPageToCanvas(source, pageNumber); const blob = await canvasToBlob(rendered.canvas, "image/png"); images.push(new Uint8Array(await blob.arrayBuffer())); rendered.canvas.width = 1;
    }
  } finally { await source.cleanup(); }
  const overrides = images.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
  const rels = images.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("");
  const ids = images.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("");
  const entries: { name: string; data: Uint8Array }[] = [
    { name: "[Content_Types].xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${overrides}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`) },
    { name: "_rels/.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>') },
    { name: "docProps/core.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${pptxXmlEscape(file.name)}</dc:title><dc:creator>LIM PDF</dc:creator></cp:coreProperties>`) },
    { name: "docProps/app.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>LIM PDF</Application><Slides>${images.length}</Slides></Properties>`) },
    { name: "ppt/presentation.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="${width}" cy="${height}" type="screen4x3"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`) },
    { name: "ppt/_rels/presentation.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${rels}</Relationships>`) },
    { name: "ppt/slideMasters/slideMaster1.xml", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>') },
    { name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>') },
    { name: "ppt/slideLayouts/slideLayout1.xml", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>') },
    { name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>') },
    { name: "ppt/theme/theme1.xml", data: encoder.encode(minimalTheme()) },
  ];
  images.forEach((image, index) => {
    const slideNumber = index + 1;
    entries.push({ name: `ppt/media/image${slideNumber}.png`, data: image });
    entries.push({ name: `ppt/slides/slide${slideNumber}.xml`, data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:pic><p:nvPicPr><p:cNvPr id="2" name="Página ${slideNumber}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`) });
    entries.push({ name: `ppt/slides/_rels/slide${slideNumber}.xml.rels`, data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${slideNumber}.png"/></Relationships>`) });
  });
  return { blob: createStoredZip(entries), filename: `${baseName(file)}.pptx` };
}

function naturalSlideSort(a: string, b: string) { return Number(a.match(/slide(\d+)\.xml$/)?.[1] || 0) - Number(b.match(/slide(\d+)\.xml$/)?.[1] || 0); }

export async function pptxToPdf(file: File, onProgress?: Progress) {
  const entries = await readZipEntries(await file.arrayBuffer());
  const slides = [...entries.keys()].filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort(naturalSlideSort);
  if (!slides.length) throw new Error("Nenhum slide PPTX foi encontrado.");
  const output = await PDFDocument.create(); const regular = await output.embedFont(StandardFonts.Helvetica); const bold = await output.embedFont(StandardFonts.HelveticaBold);
  for (let index = 0; index < slides.length; index += 1) {
    onProgress?.(`Convertendo slide ${index + 1} de ${slides.length}`, Math.round((index / slides.length) * 90));
    const slideName = slides[index]; const xml = decoder.decode(entries.get(slideName)!); const page = output.addPage([842, 595]);
    const relName = slideName.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels"; const relXml = entries.get(relName) ? decoder.decode(entries.get(relName)!) : "";
    const imageTargets = [...relXml.matchAll(/Type="[^"]*\/image"[^>]*Target="([^"]+)"/g)].map((match) => match[1]);
    let drewImage = false;
    for (const target of imageTargets.slice(0, 1)) {
      const normalized = target.startsWith("../") ? `ppt/${target.slice(3)}` : `ppt/slides/${target}`; const bytes = entries.get(normalized);
      if (!bytes) continue;
      try {
        const image = /\.png$/i.test(normalized) ? await output.embedPng(bytes) : await output.embedJpg(bytes); page.drawImage(image, { x: 0, y: 0, width: 842, height: 595 }); drewImage = true;
      } catch { /* texto ainda pode ser extraído */ }
    }
    if (!drewImage) {
      page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(1, 1, 1) });
      const texts = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((match) => match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()).filter(Boolean);
      let y = 540; texts.forEach((text, textIndex) => { if (y < 40) return; const size = textIndex === 0 ? 24 : 15; page.drawText(text.slice(0, 180), { x: 45, y, size, font: textIndex === 0 ? bold : regular, color: rgb(0.08, 0.1, 0.15), maxWidth: 750 }); y -= size + 18; });
    }
  }
  return { bytes: await output.save(), filename: `${baseName(file)}.pdf` };
}

export async function processBatch(files: File[], operation: "metadata" | "number" | "confidential" | "structural", onProgress?: Progress) {
  const entries: { name: string; data: Uint8Array }[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]; onProgress?.(`Processando ${index + 1} de ${files.length}: ${file.name}`, Math.round((index / files.length) * 100));
    const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
    if (operation === "metadata") { pdf.setTitle(""); pdf.setAuthor(""); pdf.setSubject(""); pdf.setKeywords([]); pdf.setCreator("LIM PDF"); pdf.setProducer("LIM PDF"); }
    if (operation === "number") { const font = await pdf.embedFont(StandardFonts.Helvetica); pdf.getPages().forEach((page, pageIndex) => page.drawText(String(pageIndex + 1), { x: page.getWidth() - 32, y: 18, size: 9, font, color: rgb(0.25, 0.28, 0.33) })); }
    if (operation === "confidential") { const font = await pdf.embedFont(StandardFonts.HelveticaBold); pdf.getPages().forEach((page) => page.drawText("CONFIDENCIAL", { x: page.getWidth() * 0.23, y: page.getHeight() * 0.52, size: Math.max(26, Math.min(54, page.getWidth() / 10)), font, color: rgb(0.82, 0.08, 0.08), opacity: 0.16 })); }
    if (operation === "structural") { try { pdf.getForm().flatten(); } catch { /* sem form */ } }
    entries.push({ name: `${baseName(file)}-${operation}.pdf`, data: await pdf.save({ useObjectStreams: true }) });
  }
  return { blob: createStoredZip(entries), filename: "lim-pdf-lote.zip", count: entries.length };
}

// ---- Assinatura digital CMS/PAdES-B básica, RSA PKCS#8 + X.509 PEM ----
function pemBytes(pem: string, label: string) {
  const match = pem.replace(/\r/g, "").match(new RegExp(`-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`));
  if (!match) throw new Error(`Conteúdo ${label} inválido.`);
  const binary = atob(match[1].replace(/\s+/g, "")); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i); return bytes;
}

function derLength(length: number) {
  if (length < 0x80) return new Uint8Array([length]);
  const parts: number[] = []; let value = length; while (value) { parts.unshift(value & 0xff); value >>>= 8; }
  return new Uint8Array([0x80 | parts.length, ...parts]);
}
function der(tag: number, content: Uint8Array) { return concatBytes([new Uint8Array([tag]), derLength(content.length), content]); }
function derSeq(...parts: Uint8Array[]) { return der(0x30, concatBytes(parts)); }
function derSet(...parts: Uint8Array[]) { return der(0x31, concatBytes(parts)); }
function derNull() { return new Uint8Array([0x05, 0x00]); }
function derOctet(bytes: Uint8Array) { return der(0x04, bytes); }
function derInteger(value: number) { const bytes: number[] = []; let current = value; do { bytes.unshift(current & 0xff); current >>>= 8; } while (current); if (bytes[0] & 0x80) bytes.unshift(0); return der(0x02, new Uint8Array(bytes)); }
function derOid(value: string) {
  const parts = value.split(".").map(Number); const body: number[] = [parts[0] * 40 + parts[1]];
  for (const part of parts.slice(2)) { const stack = [part & 0x7f]; let n = part >>> 7; while (n) { stack.unshift(0x80 | (n & 0x7f)); n >>>= 7; } body.push(...stack); }
  return der(0x06, new Uint8Array(body));
}
function derUtc(date: Date) { const yy = String(date.getUTCFullYear() % 100).padStart(2, "0"); const value = `${yy}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(date.getUTCSeconds()).padStart(2, "0")}Z`; return der(0x17, encoder.encode(value)); }
function byteCompare(a: Uint8Array, b: Uint8Array) { for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) return a[i] - b[i]; return a.length - b.length; }

function readDerTlv(bytes: Uint8Array, offset: number) {
  const tag = bytes[offset]; let cursor = offset + 1; let length = bytes[cursor++];
  if (length & 0x80) { const count = length & 0x7f; length = 0; for (let i = 0; i < count; i += 1) length = (length << 8) | bytes[cursor++]; }
  return { tag, start: offset, valueStart: cursor, end: cursor + length };
}

function certificateIssuerAndSerial(cert: Uint8Array) {
  const outer = readDerTlv(cert, 0); if (outer.tag !== 0x30) throw new Error("Certificado X.509 inválido.");
  const tbs = readDerTlv(cert, outer.valueStart); if (tbs.tag !== 0x30) throw new Error("TBSCertificate inválido.");
  let cursor = tbs.valueStart; let current = readDerTlv(cert, cursor); if (current.tag === 0xa0) { cursor = current.end; current = readDerTlv(cert, cursor); }
  const serial = cert.slice(current.start, current.end); cursor = current.end; const signatureAlg = readDerTlv(cert, cursor); cursor = signatureAlg.end; const issuer = readDerTlv(cert, cursor);
  return { serial, issuer: cert.slice(issuer.start, issuer.end) };
}

function algId(oid: string) { return derSeq(derOid(oid), derNull()); }
function attribute(oid: string, value: Uint8Array) { return derSeq(derOid(oid), derSet(value)); }

async function cmsDetached(content: Uint8Array, certificate: Uint8Array, privateKeyPkcs8: Uint8Array, signingTime: Date) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", content)); const certDigest = new Uint8Array(await crypto.subtle.digest("SHA-256", certificate));
  const attrs = [
    attribute("1.2.840.113549.1.9.3", derOid("1.2.840.113549.1.7.1")),
    attribute("1.2.840.113549.1.9.4", derOctet(digest)),
    attribute("1.2.840.113549.1.9.5", derUtc(signingTime)),
    attribute("1.2.840.113549.1.9.16.2.47", derSeq(derSeq(derOctet(certDigest)))),
  ].sort(byteCompare);
  const signedAttrsSet = derSet(...attrs); const key = await crypto.subtle.importKey("pkcs8", privateKeyPkcs8, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]).catch(() => { throw new Error("A chave privada precisa estar em PKCS#8 RSA PEM (BEGIN PRIVATE KEY)."); });
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, signedAttrsSet)); const { issuer, serial } = certificateIssuerAndSerial(certificate);
  const signedAttrsContent = signedAttrsSet.slice(readDerTlv(signedAttrsSet, 0).valueStart);
  const signerInfo = derSeq(derInteger(1), derSeq(issuer, serial), algId("2.16.840.1.101.3.4.2.1"), der(0xa0, signedAttrsContent), algId("1.2.840.113549.1.1.1"), derOctet(signature));
  const signedData = derSeq(derInteger(1), derSet(algId("2.16.840.1.101.3.4.2.1")), derSeq(derOid("1.2.840.113549.1.7.1")), der(0xa0, certificate), derSet(signerInfo));
  return derSeq(derOid("1.2.840.113549.1.7.2"), der(0xa0, signedData));
}

function writeAscii(target: Uint8Array, offset: number, value: string) { for (let i = 0; i < value.length; i += 1) target[offset + i] = value.charCodeAt(i); }
function bytesToHex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase(); }

export async function signPdfPades(file: File, certificatePem: string, privateKeyPem: string, options: { name: string; reason: string; visible: boolean }) {
  const certificate = pemBytes(certificatePem, "CERTIFICATE"); const privateKey = pemBytes(privateKeyPem, "PRIVATE KEY"); const reserveBytes = 32768;
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false }); const firstPage = pdf.getPages()[0]; if (!firstPage) throw new Error("PDF sem páginas.");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  if (options.visible) {
    const label = `Assinado digitalmente${options.name.trim() ? ` por ${options.name.trim()}` : ""}`; firstPage.drawRectangle({ x: 28, y: 28, width: 250, height: 38, borderWidth: 0.8, borderColor: rgb(0.2, 0.55, 0.35), color: rgb(0.95, 1, 0.97) }); firstPage.drawText(label.slice(0, 60), { x: 38, y: 48, size: 9, font, color: rgb(0.08, 0.35, 0.2) }); firstPage.drawText(new Date().toLocaleString("pt-BR"), { x: 38, y: 35, size: 7, font, color: rgb(0.3, 0.4, 0.34) });
  }
  const ctx = pdf.context; const signingTime = new Date(); const sig = ctx.obj({ Type: "Sig", Filter: "Adobe.PPKLite", SubFilter: "ETSI.CAdES.detached", ByteRange: [0, 1111111111, 2222222222, 3333333333], Contents: PDFHexString.of("0".repeat(reserveBytes * 2)), Reason: PDFHexString.fromText(options.reason || "Assinatura digital"), Name: PDFHexString.fromText(options.name || "Assinante"), M: PDFString.fromDate(signingTime) }) as PDFDict;
  const sigRef = ctx.register(sig); const widget = ctx.obj({ Type: "Annot", Subtype: "Widget", FT: "Sig", Rect: [0, 0, 0, 0], V: sigRef, T: PDFHexString.fromText("LIMPDFSignature1"), F: 4, P: firstPage.ref }) as PDFDict; const widgetRef = ctx.register(widget); firstPage.node.addAnnot(widgetRef);
  const acroName = PDFName.of("AcroForm"); let acro = pdf.catalog.lookupMaybe(acroName, PDFDict); if (!acro) { acro = ctx.obj({ Fields: [], SigFlags: 3 }) as PDFDict; pdf.catalog.set(acroName, ctx.register(acro)); }
  let fields = acro.lookupMaybe(PDFName.of("Fields"), PDFArray); if (!fields) { fields = PDFArray.withContext(ctx); acro.set(PDFName.of("Fields"), fields); } fields.push(widgetRef); acro.set(PDFName.of("SigFlags"), PDFNumber.of(3));
  const bytes = await pdf.save({ useObjectStreams: false, addDefaultPage: false }); const text = latin1Decoder.decode(bytes); const marker = `<${"0".repeat(reserveBytes * 2)}>`; const contentsStart = text.indexOf(marker); if (contentsStart < 0) throw new Error("Não foi possível localizar o espaço reservado da assinatura."); const contentsEnd = contentsStart + marker.length;
  const placeholders = ["1111111111", "2222222222", "3333333333"]; const values = [contentsStart, contentsEnd, bytes.length - contentsEnd]; placeholders.forEach((placeholder, index) => { const offset = text.indexOf(placeholder); if (offset < 0) throw new Error("ByteRange da assinatura não foi localizado."); const replacement = String(values[index]).padStart(placeholder.length, " "); if (replacement.length > placeholder.length) throw new Error("PDF grande demais para o ByteRange reservado."); writeAscii(bytes, offset, replacement); });
  const signedContent = concatBytes([bytes.slice(0, contentsStart), bytes.slice(contentsEnd)]); const cms = await cmsDetached(signedContent, certificate, privateKey, signingTime); if (cms.length > reserveBytes) throw new Error("A assinatura criptográfica excedeu o espaço reservado."); const hex = bytesToHex(cms).padEnd(reserveBytes * 2, "0"); writeAscii(bytes, contentsStart + 1, hex);
  return { bytes, filename: `${baseName(file)}-assinado-digitalmente.pdf` };
}
