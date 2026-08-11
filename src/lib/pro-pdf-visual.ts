/* eslint-disable @typescript-eslint/no-explicit-any */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createStoredZip } from "@/lib/browser-files";
import { canvasToBlob, loadPdfJsDocument, renderPdfPagesSequentially } from "@/lib/pdf-render";
import { safeBaseName, type Progress } from "@/lib/pro-pdf-core";

const MAX_RASTER_PIXELS = 18_000_000;
const TESSERACT_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";

function scriptPromise(src: string) {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-limpdf-engine="${src}"]`);
  if (existing?.dataset.ready === "1") return Promise.resolve();
  if (existing) return new Promise<void>((resolve, reject) => {
    existing.addEventListener("load", () => resolve(), { once: true });
    existing.addEventListener("error", () => reject(new Error("Falha ao carregar motor OCR.")), { once: true });
  });
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src; script.async = true; script.crossOrigin = "anonymous"; script.dataset.limpdfEngine = src;
    script.addEventListener("load", () => { script.dataset.ready = "1"; resolve(); }, { once: true });
    script.addEventListener("error", () => reject(new Error("Não foi possível carregar o motor OCR.")), { once: true });
    document.head.appendChild(script);
  });
}

async function createTesseractWorker(languages: string, onProgress?: Progress) {
  await scriptPromise(TESSERACT_SRC);
  const tesseract = (window as any).Tesseract;
  if (!tesseract?.createWorker) throw new Error("O motor OCR não ficou disponível.");
  return tesseract.createWorker(languages, 1, {
    logger: (message: { status?: string; progress?: number }) => {
      const label = message.status === "recognizing text" ? "Reconhecendo texto" : message.status === "loading language traineddata" ? "Carregando idioma" : message.status || "Preparando OCR";
      onProgress?.(label, typeof message.progress === "number" ? Math.round(message.progress * 100) : undefined);
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

export async function ocrPdf(file: File, languages: string, onProgress?: Progress) {
  const worker = await createTesseractWorker(languages, onProgress);
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const source = await loadPdfJsDocument(await file.arrayBuffer());
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`OCR da página ${pageNumber} de ${source.numPages}`, Math.round((pageNumber - 1) / source.numPages * 100));
      const sourcePage = await source.getPage(pageNumber);
      try {
        const base = sourcePage.getViewport({ scale: 1 });
        const scale = Math.min(2.2, Math.max(1.4, Math.sqrt(MAX_RASTER_PIXELS / Math.max(1, base.width * base.height))));
        const viewport = sourcePage.getViewport({ scale });
        const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Não foi possível renderizar a página para OCR.");
        await sourcePage.render({ canvas, canvasContext: context, viewport }).promise;
        const recognized = await worker.recognize(canvas, {}, { text: true, tsv: true });
        const words = parseTsvWords(String(recognized.data.tsv || ""));
        const imageBlob = await canvasToBlob(canvas, "image/jpeg", .92);
        const image = await output.embedJpg(await imageBlob.arrayBuffer());
        const page = output.addPage([base.width, base.height]);
        page.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
        for (const word of words) {
          const x = word.left / scale;
          const height = Math.max(4, word.height / scale);
          const y = base.height - (word.top + word.height) / scale;
          const size = Math.max(4, Math.min(42, height * .82));
          try { page.drawText(word.text, { x, y, size, font, maxWidth: Math.max(4, word.width / scale + 4), opacity: .002, color: rgb(0, 0, 0) }); } catch { /* caracteres fora de WinAnsi permanecem na imagem */ }
        }
        canvas.width = 1; canvas.height = 1;
      } finally { sourcePage.cleanup(); }
    }
    return { bytes: await output.save({ useObjectStreams: true }), filename: `${safeBaseName(file)}-ocr.pdf` };
  } finally {
    await source.cleanup();
    await worker.terminate();
  }
}

async function renderPage(documentPdf: any, pageNumber: number, targetWidth?: number, targetHeight?: number) {
  if (pageNumber > documentPdf.numPages) {
    const canvas = document.createElement("canvas"); canvas.width = targetWidth || 1000; canvas.height = targetHeight || 1400;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    return { canvas, baseWidth: canvas.width, baseHeight: canvas.height };
  }
  const page = await documentPdf.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1.6, Math.max(.8, Math.sqrt(4_000_000 / Math.max(1, base.width * base.height))));
    const viewport = page.getViewport({ scale });
    const naturalWidth = Math.ceil(viewport.width); const naturalHeight = Math.ceil(viewport.height);
    const canvas = document.createElement("canvas"); canvas.width = targetWidth || naturalWidth; canvas.height = targetHeight || naturalHeight;
    const context = canvas.getContext("2d", { alpha: false })!; context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    if (targetWidth && targetHeight && (targetWidth !== naturalWidth || targetHeight !== naturalHeight)) {
      const temp = document.createElement("canvas"); temp.width = naturalWidth; temp.height = naturalHeight;
      const tempContext = temp.getContext("2d", { alpha: false })!;
      await page.render({ canvas: temp, canvasContext: tempContext, viewport }).promise;
      context.drawImage(temp, 0, 0, canvas.width, canvas.height); temp.width = 1; temp.height = 1;
    } else await page.render({ canvas, canvasContext: context, viewport }).promise;
    return { canvas, baseWidth: base.width, baseHeight: base.height };
  } finally { page.cleanup(); }
}

export async function comparePdfs(first: File, second: File, threshold = 32, onProgress?: Progress) {
  const a = await loadPdfJsDocument(await first.arrayBuffer());
  const b = await loadPdfJsDocument(await second.arrayBuffer());
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.HelveticaBold);
  try {
    const total = Math.max(a.numPages, b.numPages);
    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      onProgress?.(`Comparando página ${pageNumber} de ${total}`, Math.round((pageNumber - 1) / total * 100));
      const left = await renderPage(a, pageNumber);
      const right = await renderPage(b, pageNumber, left.canvas.width, left.canvas.height);
      const diff = document.createElement("canvas"); diff.width = left.canvas.width; diff.height = left.canvas.height;
      const diffCtx = diff.getContext("2d")!;
      const leftData = left.canvas.getContext("2d")!.getImageData(0, 0, diff.width, diff.height);
      const rightData = right.canvas.getContext("2d")!.getImageData(0, 0, diff.width, diff.height);
      const out = diffCtx.createImageData(diff.width, diff.height);
      let changed = 0;
      for (let i = 0; i < out.data.length; i += 4) {
        const delta = Math.abs(leftData.data[i] - rightData.data[i]) + Math.abs(leftData.data[i + 1] - rightData.data[i + 1]) + Math.abs(leftData.data[i + 2] - rightData.data[i + 2]);
        if (delta > threshold * 3) { out.data[i] = 239; out.data[i + 1] = 16; out.data[i + 2] = 16; out.data[i + 3] = 125; changed += 1; }
      }
      diffCtx.putImageData(out, 0, 0);
      const [leftBlob, rightBlob, diffBlob] = await Promise.all([canvasToBlob(left.canvas, "image/jpeg", .84), canvasToBlob(right.canvas, "image/jpeg", .84), canvasToBlob(diff, "image/png")]);
      const [leftImg, rightImg, diffImg] = await Promise.all([output.embedJpg(await leftBlob.arrayBuffer()), output.embedJpg(await rightBlob.arrayBuffer()), output.embedPng(await diffBlob.arrayBuffer())]);
      const w = left.baseWidth; const h = left.baseHeight; const gap = 18; const header = 30;
      const page = output.addPage([w * 2 + gap, h + header]);
      page.drawText(`Versão A — página ${pageNumber}`, { x: 8, y: h + 10, size: 9, font, color: rgb(.2, .25, .32) });
      page.drawText(`Versão B + diferenças — ${changed.toLocaleString("pt-BR")} pixels`, { x: w + gap + 8, y: h + 10, size: 9, font, color: rgb(.75, .08, .08) });
      page.drawImage(leftImg, { x: 0, y: 0, width: w, height: h });
      page.drawImage(rightImg, { x: w + gap, y: 0, width: w, height: h });
      page.drawImage(diffImg, { x: w + gap, y: 0, width: w, height: h });
      left.canvas.width = 1; right.canvas.width = 1; diff.width = 1;
    }
    return { bytes: await output.save({ useObjectStreams: true }), filename: `${safeBaseName(first)}-comparado.pdf` };
  } finally { await a.cleanup(); await b.cleanup(); }
}

export async function repairPdf(file: File, onProgress?: Progress) {
  const input = new Uint8Array(await file.arrayBuffer());
  try {
    onProgress?.("Normalizando objetos e referências", 20);
    const pdf = await PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false });
    pdf.setProducer("LIM PDF — reparação estrutural");
    return { bytes: await pdf.save({ useObjectStreams: true, addDefaultPage: false }), filename: `${safeBaseName(file)}-reparado.pdf`, mode: "estrutura" as const };
  } catch { onProgress?.("Estrutura inválida. Tentando reconstrução visual", 35); }
  const source = await loadPdfJsDocument(Uint8Array.from(input).buffer);
  const output = await PDFDocument.create();
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Recuperando página ${pageNumber} de ${source.numPages}`, 35 + Math.round(pageNumber / source.numPages * 60));
      const rendered = await renderPage(source, pageNumber);
      const blob = await canvasToBlob(rendered.canvas, "image/jpeg", .9);
      const image = await output.embedJpg(await blob.arrayBuffer());
      const page = output.addPage([rendered.baseWidth, rendered.baseHeight]);
      page.drawImage(image, { x: 0, y: 0, width: rendered.baseWidth, height: rendered.baseHeight });
      rendered.canvas.width = 1;
    }
    return { bytes: await output.save(), filename: `${safeBaseName(file)}-recuperado.pdf`, mode: "visual" as const };
  } finally { await source.cleanup(); }
}

function imageObjectToCanvas(image: any) {
  const width = Number(image.width || image.bitmap?.width || 0); const height = Number(image.height || image.bitmap?.height || 0);
  if (!width || !height) throw new Error("Imagem incorporada sem dimensões válidas.");
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true })!;
  if (image.bitmap) { ctx.drawImage(image.bitmap, 0, 0, width, height); return canvas; }
  const data = image.data as Uint8Array | Uint8ClampedArray | undefined;
  if (!data) throw new Error("Imagem incorporada não expôs pixels.");
  const rgba = new Uint8ClampedArray(width * height * 4);
  if (data.length === rgba.length) rgba.set(data);
  else if (data.length === width * height * 3) for (let s = 0, d = 0; s < data.length; s += 3, d += 4) { rgba[d] = data[s]; rgba[d + 1] = data[s + 1]; rgba[d + 2] = data[s + 2]; rgba[d + 3] = 255; }
  else if (data.length === width * height) for (let s = 0, d = 0; s < data.length; s += 1, d += 4) { rgba[d] = rgba[d + 1] = rgba[d + 2] = data[s]; rgba[d + 3] = 255; }
  else throw new Error("Formato interno de imagem não suportado.");
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas;
}

export async function extractEmbeddedImages(file: File, onProgress?: Progress) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const source = await loadPdfJsDocument(await file.arrayBuffer());
  const entries: { name: string; data: Uint8Array }[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Analisando imagens da página ${pageNumber}`, Math.round((pageNumber - 1) / source.numPages * 100));
      const page = await source.getPage(pageNumber);
      try {
        const ops = await page.getOperatorList();
        const names: string[] = [];
        for (let index = 0; index < ops.fnArray.length; index += 1) {
          if (ops.fnArray[index] !== pdfjs.OPS.paintImageXObject) continue;
          const name = String(ops.argsArray[index]?.[0] || "");
          if (name && !names.includes(name)) names.push(name);
        }
        for (const name of names) {
          const image = await new Promise<any>((resolve) => {
            let settled = false;
            const timer = window.setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, 2500);
            try { page.objs.get(name, (value: any) => { if (settled) return; settled = true; window.clearTimeout(timer); resolve(value); }); } catch { window.clearTimeout(timer); resolve(null); }
          });
          if (!image) continue;
          try {
            const canvas = imageObjectToCanvas(image);
            const blob = await canvasToBlob(canvas, "image/png");
            entries.push({ name: `pagina-${String(pageNumber).padStart(3, "0")}-imagem-${String(entries.length + 1).padStart(3, "0")}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
            canvas.width = 1;
          } catch { /* segue */ }
        }
      } finally { page.cleanup(); }
    }
  } finally { await source.cleanup(); }
  if (!entries.length) throw new Error("Nenhuma imagem raster incorporada pôde ser extraída. O documento pode usar vetores ou um formato interno não exposto pelo leitor.");
  return { blob: createStoredZip(entries), filename: `${safeBaseName(file)}-imagens.zip`, count: entries.length };
}

function estimateSkew(image: ImageData, width: number, height: number) {
  const step = Math.max(2, Math.floor(Math.max(width, height) / 1200));
  const samples: Array<[number, number]> = [];
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4;
    const gray = image.data[i] * .299 + image.data[i + 1] * .587 + image.data[i + 2] * .114;
    if (gray < 120) samples.push([x, y]);
  }
  if (samples.length < 100) return 0;
  let bestAngle = 0; let bestScore = -Infinity;
  for (let angle = -4; angle <= 4; angle += .5) {
    const tangent = Math.tan(angle * Math.PI / 180); const bins = new Map<number, number>();
    for (const [x, y] of samples) { const key = Math.round((y + tangent * x) / 3); bins.set(key, (bins.get(key) || 0) + 1); }
    let score = 0; for (const count of bins.values()) score += count * count;
    if (score > bestScore) { bestScore = score; bestAngle = angle; }
  }
  return Math.abs(bestAngle) < .4 ? 0 : bestAngle;
}

function rotateCanvas(source: HTMLCanvasElement, degrees: number) {
  if (Math.abs(degrees) < .01) return source;
  const radians = degrees * Math.PI / 180; const sin = Math.abs(Math.sin(radians)); const cos = Math.abs(Math.cos(radians));
  const width = Math.ceil(source.width * cos + source.height * sin); const height = Math.ceil(source.width * sin + source.height * cos);
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false })!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); ctx.translate(width / 2, height / 2); ctx.rotate(radians); ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function cleanCanvas(canvas: HTMLCanvasElement, strength: number) {
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true })!;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = image.data; let dark = 0;
  const low = 110 + strength * 20; const high = 235 - strength * 12;
  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114;
    if (gray > high) gray = 255; else if (gray < low) gray = Math.max(0, gray * (.72 - strength * .08)); else gray = 255 * Math.pow(gray / 255, .75 - strength * .08);
    if (gray < 210) dark += 1;
    const value = Math.max(0, Math.min(255, Math.round(gray))); data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(image, 0, 0);
  return dark / Math.max(1, canvas.width * canvas.height);
}

export async function cleanScannedPdf(file: File, options: { deskew: boolean; removeBlank: boolean; strength: number; rotate: number }, onProgress?: Progress) {
  const source = await loadPdfJsDocument(await file.arrayBuffer()); const output = await PDFDocument.create(); let removed = 0;
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Limpando página ${pageNumber} de ${source.numPages}`, Math.round((pageNumber - 1) / source.numPages * 100));
      const rendered = await renderPage(source, pageNumber); let canvas = rendered.canvas;
      if (options.deskew) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const skew = estimateSkew(ctx.getImageData(0, 0, canvas.width, canvas.height), canvas.width, canvas.height);
        if (skew) { const rotated = rotateCanvas(canvas, skew); if (rotated !== canvas) { canvas.width = 1; canvas = rotated; } }
      }
      if (options.rotate) { const rotated = rotateCanvas(canvas, options.rotate); if (rotated !== canvas) { canvas.width = 1; canvas = rotated; } }
      const density = cleanCanvas(canvas, options.strength);
      if (options.removeBlank && density < .0018 && source.numPages - removed > 1) { removed += 1; canvas.width = 1; continue; }
      const blob = await canvasToBlob(canvas, "image/jpeg", .9); const image = await output.embedJpg(await blob.arrayBuffer());
      const ratio = canvas.width / canvas.height; const baseHeight = rendered.baseHeight; const baseWidth = baseHeight * ratio;
      const page = output.addPage([baseWidth, baseHeight]); page.drawImage(image, { x: 0, y: 0, width: baseWidth, height: baseHeight }); canvas.width = 1;
    }
    return { bytes: await output.save(), filename: `${safeBaseName(file)}-limpo.pdf`, removed };
  } finally { await source.cleanup(); }
}

export async function optimizePdfAdvanced(file: File, options: { mode: "structural" | "visual"; quality: number; dpiScale: number; removeMetadata: boolean; flattenForms: boolean }, onProgress?: Progress) {
  const input = new Uint8Array(await file.arrayBuffer());
  if (options.mode === "structural") {
    onProgress?.("Regravando estrutura e recursos", 35);
    const pdf = await PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false });
    if (options.flattenForms) { try { pdf.getForm().flatten(); } catch { /* sem form */ } }
    if (options.removeMetadata) { pdf.setTitle(""); pdf.setAuthor(""); pdf.setSubject(""); pdf.setKeywords([]); pdf.setCreator("LIM PDF"); pdf.setProducer("LIM PDF"); }
    return { bytes: await pdf.save({ useObjectStreams: true, objectsPerTick: 40 }), filename: `${safeBaseName(file)}-otimizado.pdf`, mode: "estrutural" as const };
  }
  const output = await PDFDocument.create(); let pageIndex = 0;
  await renderPdfPagesSequentially(Uint8Array.from(input).buffer, options.dpiScale, async ({ canvas, scale }, progress) => {
    pageIndex += 1; onProgress?.(`Comprimindo página ${pageIndex} de ${progress.totalPages}`, Math.round(pageIndex / progress.totalPages * 90));
    const blob = await canvasToBlob(canvas, "image/jpeg", options.quality); const image = await output.embedJpg(await blob.arrayBuffer());
    const page = output.addPage([canvas.width / scale, canvas.height / scale]); page.drawImage(image, { x: 0, y: 0, width: canvas.width / scale, height: canvas.height / scale });
  });
  return { bytes: await output.save({ useObjectStreams: true }), filename: `${safeBaseName(file)}-otimizado-visual.pdf`, mode: "visual" as const };
}
