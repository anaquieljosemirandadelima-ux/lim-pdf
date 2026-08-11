import { PDFDocument, PDFName } from "pdf-lib";
import { canvasToBlob, renderPdfPagesSequentially } from "@/lib/pdf-render";
import { safeBaseName, type Progress } from "@/lib/pro-pdf-core";

export type AdvancedOptimizeOptions = { mode: "structural" | "visual"; quality: number; dpiScale: number; removeMetadata: boolean; flattenForms: boolean };
function percent(input: number, output: number) { if (!input || output >= input) return 0; return Math.round((1 - output / input) * 100); }
function normalizeMetadata(pdf: PDFDocument, remove: boolean) {
  if (remove) { pdf.setTitle(""); pdf.setAuthor(""); pdf.setSubject(""); pdf.setKeywords([]); pdf.setCreator("LIM PDF"); pdf.setProducer("LIM PDF"); pdf.catalog.delete(PDFName.of("Metadata")); }
  else pdf.setProducer("LIM PDF — otimização estrutural");
  pdf.setModificationDate(new Date());
}

export async function optimizePdfAdvancedEnhanced(file: File, options: AdvancedOptimizeOptions, onProgress?: Progress) {
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  if (options.mode === "structural") {
    onProgress?.("Analisando estrutura, formulários e metadados", 18);
    const source = await PDFDocument.load(inputBytes, { ignoreEncryption: true, updateMetadata: false });
    let fields = 0;
    try { fields = source.getForm().getFields().length; } catch { fields = 0; }
    if (options.flattenForms && fields) {
      onProgress?.("Achatando formulário antes da compactação", 42);
      source.getForm().flatten();
      fields = 0;
    }
    normalizeMetadata(source, options.removeMetadata);
    onProgress?.("Regravando object streams sem reconstruir o catálogo do documento", 68);
    const bytes = await source.save({ useObjectStreams: true, objectsPerTick: 45 });
    return {
      bytes,
      filename: `${safeBaseName(file)}-otimizado.pdf`,
      mode: "estrutural" as const,
      reduction: percent(inputBytes.length, bytes.length),
      report: [
        "Páginas e estruturas de nível de documento foram preservadas, incluindo catálogo, marcadores e destinos compatíveis.",
        options.flattenForms ? "Formulários foram achatados quando solicitado." : "Formulários interativos foram preservados quando presentes.",
        "Object streams foram regravados e compactados sem reconstruir o PDF somente a partir das páginas.",
        options.removeMetadata ? "Info e XMP antigos foram removidos." : "Metadados documentais foram preservados, com produtor atualizado para a operação.",
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
