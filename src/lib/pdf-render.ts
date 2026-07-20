let pdfJsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;

export type RenderedPage = {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

async function getPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
      return pdfjs;
    });
  }
  return pdfJsPromise;
}

export async function loadPdfJsDocument(bytes: ArrayBuffer) {
  const pdfjs = await getPdfJs();
  return pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
}

export async function renderPdfPages(bytes: ArrayBuffer, scale: number, grayscale = false) {
  const document = await loadPdfJsDocument(bytes);
  const pages: RenderedPage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = documentOwnerCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("O navegador não conseguiu criar a área de renderização.");
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      if (grayscale) applyGrayscale(context, canvas.width, canvas.height);
      pages.push({ pageNumber, canvas, width: canvas.width, height: canvas.height });
      page.cleanup();
    }
  } finally {
    await document.cleanup();
  }
  return pages;
}

export async function extractTextByPage(bytes: ArrayBuffer) {
  const document = await loadPdfJsDocument(bytes);
  const result: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const text = await page.getTextContent();
      const line = text.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      result.push(line);
      page.cleanup();
    }
  } finally {
    await document.cleanup();
  }
  return result;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: "image/jpeg" | "image/png", quality = 0.86) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível gerar a imagem.")), type, quality);
  });
}

function documentOwnerCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function applyGrayscale(context: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const gray = Math.round(pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114);
    pixels[index] = gray;
    pixels[index + 1] = gray;
    pixels[index + 2] = gray;
  }
  context.putImageData(imageData, 0, 0);
}
