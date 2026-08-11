import { createStoredZipFromBlobs } from "@/lib/browser-files";
import { canvasToBlob, loadPdfJsDocument } from "@/lib/pdf-render";
import { safeBaseName, type Progress } from "@/lib/pro-pdf-core";

type PdfRasterObject = { width?: unknown; height?: unknown; bitmap?: unknown; data?: unknown };
type PdfObjectStore = { get: (name: string, callback: (value: unknown) => void) => unknown };
type PdfPageObjectSource = { objs: PdfObjectStore };

function imageObjectToCanvas(image: unknown) {
  if (!image || typeof image !== "object") throw new Error("Imagem incorporada inválida.");
  const value = image as PdfRasterObject;
  const bitmap = value.bitmap && typeof value.bitmap === "object" ? value.bitmap as { width?: unknown; height?: unknown } : null;
  const width = Number(value.width || bitmap?.width || 0); const height = Number(value.height || bitmap?.height || 0);
  if (!width || !height) throw new Error("Imagem incorporada sem dimensões válidas.");
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; const ctx = canvas.getContext("2d", { alpha: true }); if (!ctx) throw new Error("Canvas indisponível.");
  if (value.bitmap) { ctx.drawImage(value.bitmap as CanvasImageSource, 0, 0, width, height); return canvas; }
  const data = value.data instanceof Uint8Array || value.data instanceof Uint8ClampedArray ? value.data : undefined; if (!data) throw new Error("Imagem incorporada não expôs pixels.");
  const rgba = new Uint8ClampedArray(width * height * 4);
  if (data.length === rgba.length) rgba.set(data);
  else if (data.length === width * height * 3) for (let s = 0, d = 0; s < data.length; s += 3, d += 4) { rgba[d] = data[s]; rgba[d + 1] = data[s + 1]; rgba[d + 2] = data[s + 2]; rgba[d + 3] = 255; }
  else if (data.length === width * height) for (let s = 0, d = 0; s < data.length; s += 1, d += 4) { rgba[d] = rgba[d + 1] = rgba[d + 2] = data[s]; rgba[d + 3] = 255; }
  else throw new Error("Formato interno de imagem não suportado pelo extrator.");
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0); return canvas;
}

async function xObject(page: PdfPageObjectSource, name: string) {
  return new Promise<unknown>((resolve) => {
    let settled = false; const timer = window.setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, 2500);
    try { page.objs.get(name, (value: unknown) => { if (settled) return; settled = true; window.clearTimeout(timer); resolve(value); }); } catch { window.clearTimeout(timer); resolve(null); }
  });
}

export async function extractEmbeddedImagesEnhanced(file: File, onProgress?: Progress) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs"); const source = await loadPdfJsDocument(await file.arrayBuffer()); const entries: { name: string; data: Blob }[] = []; let inlineCount = 0; let xObjectCount = 0;
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Analisando imagens da página ${pageNumber} de ${source.numPages}`, Math.round((pageNumber - 1) / source.numPages * 94));
      const page = await source.getPage(pageNumber);
      try {
        const ops = await page.getOperatorList(); const names = new Set<string>();
        for (let index = 0; index < ops.fnArray.length; index += 1) {
          const fn = ops.fnArray[index]; const args = ops.argsArray[index];
          if (fn === pdfjs.OPS.paintImageXObject) { const name = String(args?.[0] || ""); if (name) names.add(name); continue; }
          if (fn === pdfjs.OPS.paintInlineImageXObject) {
            const image = args?.[0]; if (!image) continue;
            try { const canvas = imageObjectToCanvas(image); const blob = await canvasToBlob(canvas, "image/png"); inlineCount += 1; entries.push({ name: `pagina-${String(pageNumber).padStart(3, "0")}-inline-${String(inlineCount).padStart(3, "0")}.png`, data: blob }); canvas.width = 1; } catch { /* continua com demais imagens */ }
          }
        }
        for (const name of names) {
          const image = await xObject(page as unknown as PdfPageObjectSource, name); if (!image) continue;
          try { const canvas = imageObjectToCanvas(image); const blob = await canvasToBlob(canvas, "image/png"); xObjectCount += 1; entries.push({ name: `pagina-${String(pageNumber).padStart(3, "0")}-imagem-${String(xObjectCount).padStart(3, "0")}.png`, data: blob }); canvas.width = 1; } catch { /* continua */ }
        }
      } finally { page.cleanup(); }
    }
  } finally { await source.cleanup(); }
  if (!entries.length) throw new Error("Nenhuma imagem raster incorporada ou inline pôde ser extraída. O documento pode usar vetores, máscaras ou formatos internos não expostos pelo leitor.");
  return { blob: await createStoredZipFromBlobs(entries), filename: `${safeBaseName(file)}-imagens.zip`, count: entries.length, inlineCount, xObjectCount };
}
