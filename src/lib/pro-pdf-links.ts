import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString } from "pdf-lib";
import { safeBaseName } from "@/lib/pro-pdf-core";

export type PdfHyperlinkInfo = {
  page: number;
  index: number;
  url: string;
  rect: [number, number, number, number] | null;
};

function decodePdfString(value: unknown) {
  if (value instanceof PDFString || value instanceof PDFHexString) {
    try { return value.decodeText(); } catch { return value.toString(); }
  }
  return "";
}

function readRect(dict: PDFDict): [number, number, number, number] | null {
  const rect = dict.lookupMaybe(PDFName.of("Rect"), PDFArray);
  if (!rect || rect.size() < 4) return null;
  const values = Array.from({ length: 4 }, (_, index) => rect.lookupMaybe(index, PDFNumber)?.asNumber());
  return values.every((value): value is number => typeof value === "number") ? [values[0], values[1], values[2], values[3]] : null;
}

function linkAction(pdf: PDFDocument, entry: unknown) {
  const dict = pdf.context.lookupMaybe(entry as never, PDFDict);
  if (!dict || dict.get(PDFName.of("Subtype"))?.toString() !== "/Link") return null;
  const action = dict.lookupMaybe(PDFName.of("A"), PDFDict);
  const uri = action?.get(PDFName.of("URI"));
  return { dict, action, url: decodePdfString(uri), rect: readRect(dict) };
}

export async function readHyperlinks(file: File): Promise<PdfHyperlinkInfo[]> {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
  const result: PdfHyperlinkInfo[] = [];
  pdf.getPages().forEach((page, pageIndex) => {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) return;
    let linkIndex = 0;
    for (let index = 0; index < annots.size(); index += 1) {
      const info = linkAction(pdf, annots.get(index));
      if (!info) continue;
      result.push({ page: pageIndex + 1, index: linkIndex, url: info.url, rect: info.rect });
      linkIndex += 1;
    }
  });
  return result;
}

export async function editHyperlink(file: File, pageNumber: number, linkIndex: number, newUrl: string) {
  const url = new URL(newUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Use um endereço http:// ou https://.");
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const page = pdf.getPages()[pageNumber - 1];
  if (!page) throw new Error("Página inválida.");
  const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
  if (!annots) throw new Error("Nenhum hyperlink encontrado nesta página.");
  let ordinal = 0;
  for (let index = 0; index < annots.size(); index += 1) {
    const info = linkAction(pdf, annots.get(index));
    if (!info) continue;
    if (ordinal === linkIndex) {
      if (!info.action) throw new Error("Este link usa um destino interno e não possui URI editável.");
      info.action.set(PDFName.of("URI"), PDFString.of(url.toString()));
      return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-link-editado.pdf` };
    }
    ordinal += 1;
  }
  throw new Error("Hyperlink selecionado não encontrado.");
}

export async function removeHyperlink(file: File, pageNumber: number, linkIndex: number) {
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const page = pdf.getPages()[pageNumber - 1];
  if (!page) throw new Error("Página inválida.");
  const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
  if (!annots) throw new Error("Nenhum hyperlink encontrado nesta página.");
  const kept = PDFArray.withContext(pdf.context);
  let ordinal = 0;
  let removed = false;
  for (let index = 0; index < annots.size(); index += 1) {
    const entry = annots.get(index);
    const info = linkAction(pdf, entry);
    if (info && ordinal === linkIndex) {
      removed = true;
      ordinal += 1;
      continue;
    }
    if (info) ordinal += 1;
    kept.push(entry);
  }
  if (!removed) throw new Error("Hyperlink selecionado não encontrado.");
  if (kept.size()) page.node.set(PDFName.of("Annots"), kept);
  else page.node.delete(PDFName.of("Annots"));
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-link-removido.pdf` };
}
