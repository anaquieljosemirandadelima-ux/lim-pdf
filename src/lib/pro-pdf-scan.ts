import { PDFDocument } from "pdf-lib";
import { canvasToBlob, renderPdfPagesSequentially } from "@/lib/pdf-render";
import { safeBaseName, type Progress } from "@/lib/pro-pdf-core";

export type ScanRotation = "auto" | 0 | 90 | -90 | 180;

type ScanOptions = {
  deskew: boolean;
  removeBlank: boolean;
  strength: number;
  rotate: ScanRotation;
};

function darkProjectionScore(image: ImageData, width: number, height: number, orientation: 0 | 90) {
  const rowCount = orientation === 0 ? height : width;
  const colCount = orientation === 0 ? width : height;
  const step = Math.max(1, Math.floor(Math.max(width, height) / 1600));
  const rows = new Float64Array(Math.ceil(rowCount / step));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const gray = image.data[index] * .299 + image.data[index + 1] * .587 + image.data[index + 2] * .114;
      if (gray > 175) continue;
      const row = orientation === 0 ? Math.floor(y / step) : Math.floor(x / step);
      if (row < rows.length) rows[row] += 1;
    }
  }
  const mean = rows.reduce((sum, value) => sum + value, 0) / Math.max(1, rows.length);
  let variance = 0;
  for (const value of rows) variance += (value - mean) ** 2;
  return variance / Math.max(1, rows.length * colCount);
}

function detectOrientation(canvas: HTMLCanvasElement): 0 | 90 {
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!context) return 0;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const horizontal = darkProjectionScore(image, canvas.width, canvas.height, 0);
  const vertical = darkProjectionScore(image, canvas.width, canvas.height, 90);
  return vertical > horizontal * 1.18 ? 90 : 0;
}

function estimateFineSkew(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!context) return 0;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const step = Math.max(2, Math.floor(Math.max(canvas.width, canvas.height) / 1100));
  const samples: Array<[number, number]> = [];
  for (let y = 0; y < canvas.height; y += step) for (let x = 0; x < canvas.width; x += step) {
    const index = (y * canvas.width + x) * 4;
    const gray = image.data[index] * .299 + image.data[index + 1] * .587 + image.data[index + 2] * .114;
    if (gray < 130) samples.push([x, y]);
  }
  if (samples.length < 80) return 0;
  let bestAngle = 0;
  let bestScore = -Infinity;
  for (let angle = -4; angle <= 4; angle += .4) {
    const tangent = Math.tan(angle * Math.PI / 180);
    const bins = new Map<number, number>();
    for (const [x, y] of samples) {
      const key = Math.round((y + tangent * x) / 3);
      bins.set(key, (bins.get(key) || 0) + 1);
    }
    let score = 0;
    for (const count of bins.values()) score += count * count;
    if (score > bestScore) { bestScore = score; bestAngle = angle; }
  }
  return Math.abs(bestAngle) < .35 ? 0 : bestAngle;
}

function rotateCanvas(source: HTMLCanvasElement, degrees: number) {
  const normalized = ((degrees % 360) + 360) % 360;
  if (!normalized) return source;
  const radians = normalized * Math.PI / 180;
  const sin = Math.abs(Math.sin(radians)); const cos = Math.abs(Math.cos(radians));
  const width = Math.ceil(source.width * cos + source.height * sin);
  const height = Math.ceil(source.width * sin + source.height * cos);
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false })!;
  context.fillStyle = "#fff"; context.fillRect(0, 0, width, height);
  context.translate(width / 2, height / 2); context.rotate(radians);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function cleanupPixels(canvas: HTMLCanvasElement, strength: number) {
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true })!;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const low = 108 + Math.max(0, strength) * 18;
  const high = 238 - Math.max(0, strength) * 10;
  let dark = 0;
  for (let index = 0; index < data.length; index += 4) {
    let gray = data[index] * .299 + data[index + 1] * .587 + data[index + 2] * .114;
    if (gray >= high) gray = 255;
    else if (gray <= low) gray = Math.max(0, gray * (.76 - strength * .06));
    else gray = 255 * Math.pow(gray / 255, .76 - strength * .06);
    if (gray < 210) dark += 1;
    const value = Math.max(0, Math.min(255, Math.round(gray)));
    data[index] = data[index + 1] = data[index + 2] = value;
  }
  context.putImageData(image, 0, 0);
  return dark / Math.max(1, canvas.width * canvas.height);
}

export async function cleanScannedPdfEnhanced(file: File, options: ScanOptions, onProgress?: Progress) {
  const output = await PDFDocument.create();
  let removed = 0;
  let correctedOrientation = 0;
  let fineDeskewed = 0;
  let pageIndex = 0;

  await renderPdfPagesSequentially(await file.arrayBuffer(), 1.55, async ({ canvas, scale }, info) => {
    pageIndex += 1;
    onProgress?.(`Analisando orientação da página ${pageIndex} de ${info.totalPages}`, Math.round((pageIndex - 1) / info.totalPages * 90));
    let working = canvas;

    const rotation = options.rotate === "auto" ? detectOrientation(working) : Number(options.rotate);
    if (rotation) {
      const rotated = rotateCanvas(working, rotation);
      if (rotated !== working) { working = rotated; correctedOrientation += 1; }
    }

    if (options.deskew) {
      const fine = estimateFineSkew(working);
      if (fine) {
        const rotated = rotateCanvas(working, fine);
        if (rotated !== working) { working = rotated; fineDeskewed += 1; }
      }
    }

    const density = cleanupPixels(working, options.strength);
    if (options.removeBlank && density < .0017 && info.totalPages - removed > 1) {
      removed += 1;
      if (working !== canvas) working.width = 1;
      return;
    }

    const blob = await canvasToBlob(working, "image/jpeg", .9);
    const image = await output.embedJpg(await blob.arrayBuffer());
    const pageWidth = working.width / scale;
    const pageHeight = working.height / scale;
    const page = output.addPage([pageWidth, pageHeight]);
    page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    if (working !== canvas) working.width = 1;
  });

  return {
    bytes: await output.save({ useObjectStreams: true }),
    filename: `${safeBaseName(file)}-limpo.pdf`,
    removed,
    correctedOrientation,
    fineDeskewed,
  };
}
