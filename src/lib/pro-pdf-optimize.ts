import { PDFDocument } from "pdf-lib";
import { canvasToBlob, renderPdfPagesSequentially } from "@/lib/pdf-render";
import { safeBaseName, type Progress } from "@/lib/pro-pdf-core";

export type AdvancedOptimizeOptions = {
  mode: "structural" | "visual";
  quality: number;
  dpiScale: number;
  removeMetadata: boolean;
  flattenForms: boolean;
};

function percent(input: number, output: number) {
  if (!input || output >= input) return 0;
  return Math.round((1 - output / input) * 100);
}

function normalizeMetadata(pdf: PDFDocument, remove: boolean) {
  if (remove) {
    pdf.setTitle("");
    pdf.setAuthor("");
    pdf.setSubject("");
    pdf.setKeywords([]);
    pdf.setCreator("LIM PDF");
    pdf.setProducer("LIM PDF");
  } else {
    pdf.setProducer("LIM PDF — otimização estrutural");
  }
  pdf.setModificationDate(new Date());
}

export async function optimizePdfAdvancedEnhanced(file: File, options: AdvancedOptimizeOptions, onProgress?: Progress) {
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  if (options.mode === "structural") {
    onProgress?.("Analisando recursos, formulários e objetos alcançáveis", 16);
    const source = await PDFDocument.load(inputBytes, { ignoreEncryption: true, updateMetadata: false });
    let fields = 0;
    try { fields = source.getForm().getFields().length; } catch { fields = 0; }
    if (options.flattenForms && fields) {
      source.getForm().flatten();
      fields = 0;
    }
    normalizeMetadata(source, options.removeMetadata);

    let bytes: Uint8Array;
    let garbageCollected = false;
    if (fields === 0) {
      onProgress?.("Copiando somente páginas e dependências referenciadas", 48);
      const compact = await PDFDocument.create();
      const copied = await compact.copyPages(source, source.getPageIndices());
      copied.forEach((page) => compact.addPage(page));
      normalizeMetadata(compact, options.removeMetadata);
      bytes = await compact.save({ useObjectStreams: true, objectsPerTick: 45 });
      garbageCollected = true;
    } else {
      onProgress?.("Preservando AcroForm interativo e compactando object streams", 58);
      bytes = await source.save({ useObjectStreams: true, objectsPerTick: 45 });
    }

    return {
      bytes,
      filename: `${safeBaseName(file)}-otimizado.pdf`,
      mode: "estrutural" as const,
      reduction: percent(inputBytes.length, bytes.length),
      report: [
        garbageCollected ? "Objetos não alcançáveis foram descartados ao reconstruir somente páginas e dependências referenciadas." : "Formulários interativos foram preservados; a limpeza de objetos não alcançáveis foi limitada para não quebrar o AcroForm.",
        "Object streams foram regravados e compactados.",
        options.removeMetadata ? "Metadados desnecessários foram removidos." : "Metadados documentais foram preservados.",
        `${percent(inputBytes.length, bytes.length)}% de redução estrutural quando houve ganho real.`,
      ],
    };
  }

  const output = await PDFDocument.create();
  let pages = 0;
  await renderPdfPagesSequentially(Uint8Array.from(inputBytes).buffer, options.dpiScale, async ({ canvas, scale }, info) => {
    pages += 1;
    onProgress?.(`Recomprimindo imagens da página ${pages} de ${info.totalPages}`, 10 + Math.round(pages / info.totalPages * 82));
    const blob = await canvasToBlob(canvas, "image/jpeg", options.quality);
    const image = await output.embedJpg(await blob.arrayBuffer());
    const page = output.addPage([canvas.width / scale, canvas.height / scale]);
    page.drawImage(image, { x: 0, y: 0, width: canvas.width / scale, height: canvas.height / scale });
  });
  normalizeMetadata(output, options.removeMetadata);
  const bytes = await output.save({ useObjectStreams: true, objectsPerTick: 45 });
  return {
    bytes,
    filename: `${safeBaseName(file)}-otimizado-visual.pdf`,
    mode: "visual" as const,
    reduction: percent(inputBytes.length, bytes.length),
    report: [
      "Imagens e vetores foram recomprimidos por página em JPEG; este modo prioriza redução de tamanho.",
      "Texto e vetores deixam de ser objetos independentes, por isso use o modo estrutural quando precisar manter seleção de texto.",
      `${percent(inputBytes.length, bytes.length)}% de redução quando o arquivo final ficou menor.`,
    ],
  };
}
