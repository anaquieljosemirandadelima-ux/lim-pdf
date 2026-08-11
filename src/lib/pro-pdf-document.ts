import { PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";
import { createStoredZipFromBlobs } from "@/lib/browser-files";
import { safeBaseName, type MetadataDraft, type Progress } from "@/lib/pro-pdf-core";

const MAX_BATCH_OUTPUT_BYTES = 700 * 1024 * 1024;

function stripXmp(pdf: PDFDocument) { pdf.catalog.delete(PDFName.of("Metadata")); }
function applyMetadata(pdf: PDFDocument, metadata: MetadataDraft) {
  if (metadata.title !== undefined) pdf.setTitle(metadata.title);
  if (metadata.author !== undefined) pdf.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdf.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) pdf.setKeywords(metadata.keywords.split(",").map((value) => value.trim()).filter(Boolean));
  if (metadata.creator !== undefined) pdf.setCreator(metadata.creator);
  if (metadata.producer !== undefined) pdf.setProducer(metadata.producer);
  pdf.setModificationDate(new Date());
}

export async function editMetadataEnhanced(file: File, metadata: MetadataDraft) {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  applyMetadata(pdf, metadata);
  // Remove XMP antigo para impedir que autor/título/datas antigos sobrevivam à edição do Info dictionary.
  stripXmp(pdf);
  return { bytes: await pdf.save({ useObjectStreams: true }), filename: `${safeBaseName(file)}-metadados.pdf` };
}

function uniqueName(base: string, used: Set<string>) {
  if (!used.has(base)) { used.add(base); return base; }
  const dot = base.lastIndexOf("."); const stem = dot >= 0 ? base.slice(0, dot) : base; const ext = dot >= 0 ? base.slice(dot) : "";
  let index = 2; let candidate = `${stem}-${index}${ext}`;
  while (used.has(candidate)) { index += 1; candidate = `${stem}-${index}${ext}`; }
  used.add(candidate); return candidate;
}

export async function processBatchEnhanced(files: File[], operation: "metadata" | "number" | "confidential" | "structural", onProgress?: Progress) {
  if (!files.length) throw new Error("Selecione pelo menos um PDF.");
  if (files.length > 30) throw new Error("Processe no máximo 30 PDFs por lote para manter o navegador estável.");
  const entries: { name: string; data: Blob }[] = []; const used = new Set<string>(); let outputBytes = 0;
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]; onProgress?.(`Processando ${index + 1} de ${files.length}: ${file.name}`, Math.round(index / files.length * 100));
    const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
    if (operation === "metadata") { pdf.setTitle(""); pdf.setAuthor(""); pdf.setSubject(""); pdf.setKeywords([]); pdf.setCreator("LIM PDF"); pdf.setProducer("LIM PDF"); stripXmp(pdf); }
    if (operation === "number") { const font = await pdf.embedFont(StandardFonts.Helvetica); pdf.getPages().forEach((page, pageIndex) => page.drawText(String(pageIndex + 1), { x: page.getWidth() - 32, y: 18, size: 9, font, color: rgb(.25, .28, .33) })); }
    if (operation === "confidential") { const font = await pdf.embedFont(StandardFonts.HelveticaBold); pdf.getPages().forEach((page) => page.drawText("CONFIDENCIAL", { x: page.getWidth() * .23, y: page.getHeight() * .52, size: Math.max(26, Math.min(54, page.getWidth() / 10)), font, color: rgb(.82, .08, .08), opacity: .16 })); }
    if (operation === "structural") { try { pdf.getForm().flatten(); } catch { /* sem form */ } }
    const bytes = await pdf.save({ useObjectStreams: true }); outputBytes += bytes.length;
    if (outputBytes > MAX_BATCH_OUTPUT_BYTES) throw new Error("A saída acumulada do lote ultrapassaria 700 MB. Divida os arquivos em dois lotes menores.");
    const name = uniqueName(`${safeBaseName(file)}-${operation}.pdf`, used);
    entries.push({ name, data: new Blob([Uint8Array.from(bytes).buffer], { type: "application/pdf" }) });
  }
  onProgress?.("Montando ZIP sem duplicar todos os PDFs na memória", 96);
  return { blob: await createStoredZipFromBlobs(entries), filename: "lim-pdf-lote.zip", count: entries.length };
}
