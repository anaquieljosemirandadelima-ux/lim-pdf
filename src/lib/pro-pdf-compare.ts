import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { canvasToBlob, loadPdfJsDocument } from "@/lib/pdf-render";
import { safeBaseName, type Progress } from "@/lib/pro-pdf-core";

type PdfJsDocument = Awaited<ReturnType<typeof loadPdfJsDocument>>;
type TextItem = { str?: string };
type PageTextDiff = { page: number; added: string[]; removed: string[]; sameWords: number };

const MAX_COMPARE_PAGES = 120;
const MAX_COMPARE_RASTER_PIXELS = 180_000_000;

function tokens(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFKC").match(/[\p{L}\p{N}]+/gu) || [];
}

function multisetDiff(left: string[], right: string[]) {
  const counts = new Map<string, number>();
  left.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  const added: string[] = [];
  let same = 0;
  for (const word of right) {
    const count = counts.get(word) || 0;
    if (count > 0) { counts.set(word, count - 1); same += 1; }
    else added.push(word);
  }
  const removed: string[] = [];
  for (const [word, count] of counts) for (let index = 0; index < count; index += 1) removed.push(word);
  return { added, removed, same };
}

async function pageText(document: PdfJsDocument, pageNumber: number) {
  if (pageNumber > document.numPages) return "";
  const page = await document.getPage(pageNumber);
  try {
    const content = await page.getTextContent();
    return (content.items as TextItem[]).map((item) => item.str || "").join(" ").replace(/\s+/g, " ").trim();
  } finally { page.cleanup(); }
}

async function renderPage(document: PdfJsDocument, pageNumber: number, targetWidth?: number, targetHeight?: number) {
  if (pageNumber > document.numPages) {
    const canvas = window.document.createElement("canvas"); canvas.width = targetWidth || 1000; canvas.height = targetHeight || 1400;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    return { canvas, baseWidth: canvas.width, baseHeight: canvas.height };
  }
  const page = await document.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1.55, Math.max(.8, Math.sqrt(4_000_000 / Math.max(1, base.width * base.height))));
    const viewport = page.getViewport({ scale });
    const naturalWidth = Math.ceil(viewport.width); const naturalHeight = Math.ceil(viewport.height);
    const canvas = window.document.createElement("canvas"); canvas.width = targetWidth || naturalWidth; canvas.height = targetHeight || naturalHeight;
    const context = canvas.getContext("2d", { alpha: false })!; context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    if (targetWidth && targetHeight && (targetWidth !== naturalWidth || targetHeight !== naturalHeight)) {
      const temp = window.document.createElement("canvas"); temp.width = naturalWidth; temp.height = naturalHeight;
      const tempContext = temp.getContext("2d", { alpha: false })!;
      await page.render({ canvas: temp, canvasContext: tempContext, viewport }).promise;
      context.drawImage(temp, 0, 0, canvas.width, canvas.height); temp.width = 1; temp.height = 1;
    } else await page.render({ canvas, canvasContext: context, viewport }).promise;
    return { canvas, baseWidth: base.width, baseHeight: base.height };
  } finally { page.cleanup(); }
}

function safeText(value: string) {
  return value.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");
}

export async function comparePdfs(fileA: File, fileB: File, threshold = 32, onProgress?: Progress) {
  const [a, b] = await Promise.all([loadPdfJsDocument(await fileA.arrayBuffer()), loadPdfJsDocument(await fileB.arrayBuffer())]);
  const output = await PDFDocument.create();
  const regular = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);
  const total = Math.max(a.numPages, b.numPages);
  const textDiffs: PageTextDiff[] = [];
  let rasterPixels = 0;

  try {
    if (total > MAX_COMPARE_PAGES) throw new Error(`A comparação aceita até ${MAX_COMPARE_PAGES} páginas por execução. Divida documentos maiores em partes.`);

    const summary = output.addPage([595, 842]);
    summary.drawText("Relatório de comparação — LIM PDF", { x: 42, y: 790, size: 20, font: bold, color: rgb(.08, .1, .15) });
    summary.drawText(`Documento A: ${safeText(fileA.name).slice(0, 70)}`, { x: 42, y: 758, size: 9, font: regular, color: rgb(.35, .39, .45) });
    summary.drawText(`Documento B: ${safeText(fileB.name).slice(0, 70)}`, { x: 42, y: 743, size: 9, font: regular, color: rgb(.35, .39, .45) });

    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      onProgress?.(`Comparando conteúdo da página ${pageNumber} de ${total}`, Math.round((pageNumber - 1) / total * 82));
      const [leftText, rightText] = await Promise.all([pageText(a, pageNumber), pageText(b, pageNumber)]);
      const textDiff = multisetDiff(tokens(leftText), tokens(rightText));
      const pageDiff = { page: pageNumber, added: textDiff.added, removed: textDiff.removed, sameWords: textDiff.same };
      textDiffs.push(pageDiff);

      const left = await renderPage(a, pageNumber);
      const right = await renderPage(b, pageNumber, left.canvas.width, left.canvas.height);
      const pagePixels = left.canvas.width * left.canvas.height;
      rasterPixels += pagePixels * 3;
      if (rasterPixels > MAX_COMPARE_RASTER_PIXELS) {
        left.canvas.width = 1; right.canvas.width = 1;
        throw new Error("Os documentos exigiriam memória demais para comparação em uma única execução. Divida-os em partes menores.");
      }

      const diffCanvas = window.document.createElement("canvas"); diffCanvas.width = left.canvas.width; diffCanvas.height = left.canvas.height;
      const diffCtx = diffCanvas.getContext("2d")!;
      const leftData = left.canvas.getContext("2d")!.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
      const rightData = right.canvas.getContext("2d")!.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
      const out = diffCtx.createImageData(diffCanvas.width, diffCanvas.height);
      let changed = 0;
      for (let index = 0; index < out.data.length; index += 4) {
        const delta = Math.abs(leftData.data[index] - rightData.data[index]) + Math.abs(leftData.data[index + 1] - rightData.data[index + 1]) + Math.abs(leftData.data[index + 2] - rightData.data[index + 2]);
        if (delta > threshold * 3) { out.data[index] = 239; out.data[index + 1] = 16; out.data[index + 2] = 16; out.data[index + 3] = 135; changed += 1; }
      }
      diffCtx.putImageData(out, 0, 0);

      const [leftBlob, rightBlob, diffBlob] = await Promise.all([
        canvasToBlob(left.canvas, "image/jpeg", .84),
        canvasToBlob(right.canvas, "image/jpeg", .84),
        canvasToBlob(diffCanvas, "image/png"),
      ]);
      const [leftImg, rightImg, diffImg] = await Promise.all([
        output.embedJpg(await leftBlob.arrayBuffer()),
        output.embedJpg(await rightBlob.arrayBuffer()),
        output.embedPng(await diffBlob.arrayBuffer()),
      ]);
      const gap = 18; const header = 42;
      const page = output.addPage([left.baseWidth * 2 + gap, left.baseHeight + header]);
      page.drawText(`A — página ${pageNumber}`, { x: 8, y: left.baseHeight + 23, size: 9, font: bold, color: rgb(.2, .25, .32) });
      page.drawText("B + mapa de diferenças", { x: left.baseWidth + gap + 8, y: left.baseHeight + 23, size: 9, font: bold, color: rgb(.7, .08, .08) });
      page.drawText(`${changed.toLocaleString("pt-BR")} pixels alterados · texto +${pageDiff.added.length}/-${pageDiff.removed.length}`, { x: left.baseWidth + gap + 8, y: left.baseHeight + 9, size: 7, font: regular, color: rgb(.45, .48, .53) });
      page.drawImage(leftImg, { x: 0, y: 0, width: left.baseWidth, height: left.baseHeight });
      page.drawImage(rightImg, { x: left.baseWidth + gap, y: 0, width: left.baseWidth, height: left.baseHeight });
      page.drawImage(diffImg, { x: left.baseWidth + gap, y: 0, width: left.baseWidth, height: left.baseHeight });

      left.canvas.width = 1; left.canvas.height = 1;
      right.canvas.width = 1; right.canvas.height = 1;
      diffCanvas.width = 1; diffCanvas.height = 1;
    }

    let y = 710;
    for (const diff of textDiffs) {
      if (y < 85) break;
      summary.drawText(`Página ${diff.page}: +${diff.added.length} / -${diff.removed.length} palavras`, { x: 42, y, size: 11, font: bold, color: diff.added.length || diff.removed.length ? rgb(.72, .1, .1) : rgb(.15, .45, .26) });
      y -= 17;
      if (diff.added.length) { summary.drawText(`Adicionado: ${safeText(diff.added.slice(0, 14).join(", ")).slice(0, 105)}`, { x: 54, y, size: 8, font: regular, color: rgb(.2, .42, .22) }); y -= 13; }
      if (diff.removed.length) { summary.drawText(`Removido: ${safeText(diff.removed.slice(0, 14).join(", ")).slice(0, 105)}`, { x: 54, y, size: 8, font: regular, color: rgb(.64, .16, .16) }); y -= 13; }
      y -= 8;
    }

    return {
      bytes: await output.save({ useObjectStreams: true }),
      filename: `${safeBaseName(fileA)}-comparado.pdf`,
      report: textDiffs.map((diff) => `Pág. ${diff.page}: +${diff.added.length} / -${diff.removed.length} palavras`),
    };
  } finally { await a.cleanup(); await b.cleanup(); }
}
