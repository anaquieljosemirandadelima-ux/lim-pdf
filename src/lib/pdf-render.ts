let pdfJsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;

export type RenderedPage = {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  scale: number;
};

export type RenderPageProgress = {
  pageNumber: number;
  totalPages: number;
};

const MAX_RENDER_PIXELS_PER_PAGE = 18_000_000;

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

function safeRenderScale(widthAtOne: number, heightAtOne: number, requestedScale: number) {
  if (!Number.isFinite(requestedScale) || requestedScale <= 0) throw new Error("Resolução de renderização inválida.");
  const requestedPixels = widthAtOne * heightAtOne * requestedScale * requestedScale;
  if (requestedPixels <= MAX_RENDER_PIXELS_PER_PAGE) return requestedScale;
  const capped = Math.sqrt(MAX_RENDER_PIXELS_PER_PAGE / Math.max(1, widthAtOne * heightAtOne));
  return Math.max(0.35, Math.min(requestedScale, capped));
}

export async function renderPdfPagesSequentially(
  bytes: ArrayBuffer,
  requestedScale: number,
  onPage: (page: RenderedPage, progress: RenderPageProgress) => Promise<void> | void,
  grayscale = false,
) {
  const document = await loadPdfJsDocument(bytes);
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = safeRenderScale(baseViewport.width, baseViewport.height, requestedScale);
        const viewport = page.getViewport({ scale });
        const canvas = documentOwnerCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext("2d", { alpha: false, willReadFrequently: grayscale });
        if (!context) throw new Error("O navegador não conseguiu criar a área de renderização.");
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        if (grayscale) applyGrayscale(context, canvas.width, canvas.height);
        try {
          await onPage(
            { pageNumber, canvas, width: canvas.width, height: canvas.height, scale },
            { pageNumber, totalPages: document.numPages },
          );
        } finally {
          canvas.width = 1;
          canvas.height = 1;
        }
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await document.cleanup();
  }
}

export async function renderPdfPages(bytes: ArrayBuffer, scale: number, grayscale = false) {
  const pages: RenderedPage[] = [];
  await renderPdfPagesSequentially(
    bytes,
    scale,
    ({ pageNumber, canvas, width, height, scale: effectiveScale }) => {
      const copy = documentOwnerCanvas(width, height);
      const context = copy.getContext("2d", { alpha: false });
      if (!context) throw new Error("O navegador não conseguiu copiar a página renderizada.");
      context.drawImage(canvas, 0, 0);
      pages.push({ pageNumber, canvas: copy, width, height, scale: effectiveScale });
    },
    grayscale,
  );
  return pages;
}

export async function extractTextByPage(bytes: ArrayBuffer) {
  const document = await loadPdfJsDocument(bytes);
  const result: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const text = await page.getTextContent();
        const line = text.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        result.push(line);
      } finally {
        page.cleanup();
      }
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
