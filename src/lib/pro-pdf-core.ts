import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString, StandardFonts, rgb } from "pdf-lib";
import { createStoredZip } from "@/lib/browser-files";

export type Progress = (message: string, percent?: number) => void;
export type FormFieldDraft = {
  type: "text" | "checkbox" | "radio" | "dropdown" | "list" | "date" | "signature";
  name: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  options?: string[];
};
export type BookmarkDraft = { title: string; page: number; level?: number };
export type MetadataDraft = { title?: string; author?: string; subject?: string; keywords?: string; creator?: string; producer?: string };

export function safeBaseName(file: File) {
  return file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "lim-pdf";
}

export function ownedArrayBuffer(bytes: Uint8Array) {
  return Uint8Array.from(bytes).buffer;
}

function ensureHttpUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use um endereço http:// ou https://.");
  return url.toString();
}

export async function addHyperlink(file: File, options: { url: string; page: number; x: number; y: number; width: number; height: number }) {
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const page = pdf.getPages()[options.page - 1];
  if (!page) throw new Error("Página inválida.");
  const ctx = pdf.context;
  const action = PDFDict.withContext(ctx);
  action.set(PDFName.of("S"), PDFName.of("URI"));
  action.set(PDFName.of("URI"), PDFString.of(ensureHttpUrl(options.url)));
  const annotation = PDFDict.withContext(ctx);
  annotation.set(PDFName.of("Type"), PDFName.of("Annot"));
  annotation.set(PDFName.of("Subtype"), PDFName.of("Link"));
  annotation.set(PDFName.of("Rect"), ctx.obj([options.x, options.y, options.x + options.width, options.y + options.height]) as PDFArray);
  annotation.set(PDFName.of("Border"), ctx.obj([0, 0, 0]) as PDFArray);
  annotation.set(PDFName.of("A"), ctx.register(action));
  page.node.addAnnot(ctx.register(annotation));
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-com-link.pdf` };
}

export async function addInternalPageLink(file: File, options: { sourcePage: number; targetPage: number; x: number; y: number; width: number; height: number }) {
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const pages = pdf.getPages();
  const source = pages[options.sourcePage - 1];
  const target = pages[options.targetPage - 1];
  if (!source || !target) throw new Error("Página de origem ou destino inválida.");
  const ctx = pdf.context;
  const annotation = PDFDict.withContext(ctx);
  annotation.set(PDFName.of("Type"), PDFName.of("Annot"));
  annotation.set(PDFName.of("Subtype"), PDFName.of("Link"));
  annotation.set(PDFName.of("Rect"), ctx.obj([options.x, options.y, options.x + options.width, options.y + options.height]) as PDFArray);
  annotation.set(PDFName.of("Border"), ctx.obj([0, 0, 0]) as PDFArray);
  annotation.set(PDFName.of("Dest"), ctx.obj([target.ref, PDFName.of("Fit")]) as PDFArray);
  source.node.addAnnot(ctx.register(annotation));
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-link-interno.pdf` };
}

export async function addNativeAnnotation(file: File, options: { type: "note" | "highlight" | "underline" | "strikeout"; page: number; x: number; y: number; width: number; height: number; text: string }) {
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const page = pdf.getPages()[options.page - 1];
  if (!page) throw new Error("Página inválida.");
  const ctx = pdf.context;
  const subtype = options.type === "note" ? "Text" : options.type === "highlight" ? "Highlight" : options.type === "underline" ? "Underline" : "StrikeOut";
  const annotation = PDFDict.withContext(ctx);
  annotation.set(PDFName.of("Type"), PDFName.of("Annot"));
  annotation.set(PDFName.of("Subtype"), PDFName.of(subtype));
  annotation.set(PDFName.of("Rect"), ctx.obj([options.x, options.y, options.x + options.width, options.y + options.height]) as PDFArray);
  annotation.set(PDFName.of("Contents"), PDFHexString.fromText(options.text || "Anotação LIM PDF"));
  annotation.set(PDFName.of("C"), ctx.obj(options.type === "note" ? [1, .78, .2] : [1, .9, .2]) as PDFArray);
  if (options.type !== "note") {
    annotation.set(PDFName.of("QuadPoints"), ctx.obj([options.x, options.y + options.height, options.x + options.width, options.y + options.height, options.x, options.y, options.x + options.width, options.y]) as PDFArray);
  } else annotation.set(PDFName.of("Name"), PDFName.of("Comment"));
  page.node.addAnnot(ctx.register(annotation));
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-anotado.pdf` };
}

export async function createFormPdf(file: File, fields: FormFieldDraft[]) {
  if (!fields.length) throw new Error("Adicione pelo menos um campo.");
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const form = pdf.getForm();
  const pages = pdf.getPages();
  for (const draft of fields) {
    const page = pages[draft.page - 1];
    if (!page) throw new Error(`Página ${draft.page} não existe.`);
    const opts = { x: draft.x, y: draft.y, width: draft.width, height: draft.height, borderWidth: 1, textColor: rgb(.08, .1, .15), borderColor: rgb(.65, .68, .74), backgroundColor: rgb(1, 1, 1) };
    if (draft.type === "text" || draft.type === "date" || draft.type === "signature") {
      const field = form.createTextField(draft.name);
      if (draft.type === "date") field.setText("");
      if (draft.type === "signature") field.enableReadOnly();
      field.addToPage(page, opts);
    }
    if (draft.type === "checkbox") form.createCheckBox(draft.name).addToPage(page, opts);
    if (draft.type === "dropdown") { const field = form.createDropdown(draft.name); field.addOptions(draft.options?.length ? draft.options : ["Opção 1", "Opção 2"]); field.addToPage(page, opts); }
    if (draft.type === "list") { const field = form.createOptionList(draft.name); field.addOptions(draft.options?.length ? draft.options : ["Opção 1", "Opção 2"]); field.addToPage(page, opts); }
    if (draft.type === "radio") {
      const field = form.createRadioGroup(draft.name);
      const choices = draft.options?.length ? draft.options : ["Sim", "Não"];
      choices.forEach((choice, index) => field.addOptionToPage(choice, page, { ...opts, x: draft.x + index * (draft.width + 12) }));
    }
  }
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-formulario.pdf` };
}

export async function addBookmarks(file: File, bookmarks: BookmarkDraft[]) {
  if (!bookmarks.length) throw new Error("Adicione pelo menos um marcador.");
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const pages = pdf.getPages();
  const ctx = pdf.context;
  const root = PDFDict.withContext(ctx);
  root.set(PDFName.of("Type"), PDFName.of("Outlines"));
  const rootRef = ctx.register(root);
  const refs: ReturnType<typeof ctx.register>[] = [];
  const dicts: PDFDict[] = [];
  for (const bookmark of bookmarks) {
    const page = pages[bookmark.page - 1];
    if (!page) throw new Error(`Página ${bookmark.page} não existe.`);
    const dict = PDFDict.withContext(ctx);
    dict.set(PDFName.of("Title"), PDFHexString.fromText(bookmark.title));
    dict.set(PDFName.of("Parent"), rootRef);
    dict.set(PDFName.of("Dest"), ctx.obj([page.ref, PDFName.of("Fit")]) as PDFArray);
    dicts.push(dict); refs.push(ctx.register(dict));
  }
  dicts.forEach((dict, index) => { if (index > 0) dict.set(PDFName.of("Prev"), refs[index - 1]); if (index < refs.length - 1) dict.set(PDFName.of("Next"), refs[index + 1]); });
  root.set(PDFName.of("First"), refs[0]); root.set(PDFName.of("Last"), refs.at(-1)!); root.set(PDFName.of("Count"), PDFNumber.of(refs.length));
  pdf.catalog.set(PDFName.of("Outlines"), rootRef); pdf.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-marcadores.pdf` };
}

export async function addBates(file: File, options: { prefix: string; start: number; digits: number; position: "bottom-right" | "bottom-left" | "top-right" | "top-left" }) {
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.getPages().forEach((page, index) => {
    const label = `${options.prefix}${String(options.start + index).padStart(options.digits, "0")}`;
    const size = 9; const textWidth = font.widthOfTextAtSize(label, size); const margin = 22;
    const x = options.position.endsWith("right") ? page.getWidth() - textWidth - margin : margin;
    const y = options.position.startsWith("top") ? page.getHeight() - margin - size : margin;
    page.drawText(label, { x, y, size, font, color: rgb(.18, .2, .24) });
  });
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-bates.pdf` };
}

export async function editMetadata(file: File, metadata: MetadataDraft) {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  if (metadata.title !== undefined) pdf.setTitle(metadata.title);
  if (metadata.author !== undefined) pdf.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdf.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) pdf.setKeywords(metadata.keywords.split(",").map((value) => value.trim()).filter(Boolean));
  if (metadata.creator !== undefined) pdf.setCreator(metadata.creator);
  if (metadata.producer !== undefined) pdf.setProducer(metadata.producer);
  pdf.setModificationDate(new Date());
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-metadados.pdf` };
}

export async function readMetadata(file: File): Promise<MetadataDraft> {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false, ignoreEncryption: true });
  return { title: pdf.getTitle() || "", author: pdf.getAuthor() || "", subject: pdf.getSubject() || "", keywords: pdf.getKeywords() || "", creator: pdf.getCreator() || "", producer: pdf.getProducer() || "" };
}

function xmpEscape(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export async function preparePdfA(file: File) {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false, ignoreEncryption: true });
  try { pdf.getForm().flatten(); } catch { /* sem formulário */ }
  const now = new Date();
  const title = pdf.getTitle() || file.name;
  pdf.setTitle(title); pdf.setProducer("LIM PDF PDF/A preparation"); pdf.setCreator("LIM PDF"); pdf.setModificationDate(now);
  try { pdf.getCreationDate(); } catch { pdf.setCreationDate(now); }
  const date = now.toISOString();
  const xmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" pdfaid:part="2" pdfaid:conformance="B"/><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmpEscape(title)}</rdf:li></rdf:Alt></dc:title><xmp:ModifyDate>${date}</xmp:ModifyDate><pdf:Producer>LIM PDF PDF/A preparation</pdf:Producer></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  const stream = pdf.context.flateStream(new TextEncoder().encode(xmp), { Type: "Metadata", Subtype: "XML" });
  pdf.catalog.set(PDFName.of("Metadata"), pdf.context.register(stream));
  pdf.catalog.set(PDFName.of("Lang"), PDFString.of("pt-BR"));
  return {
    bytes: await pdf.save({ useObjectStreams: false }),
    filename: `${safeBaseName(file)}-pdfa-preparado.pdf`,
    report: ["XMP PDF/A-2B inserido", "Formulários achatados quando presentes", "Metadados normalizados", "Arquivo salvo sem nova criptografia", "Validação externa de ICC/fontes continua necessária para comprovação ISO 19005"],
  };
}

export async function processBatch(files: File[], operation: "metadata" | "number" | "confidential" | "structural", onProgress?: Progress) {
  const entries: { name: string; data: Uint8Array }[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    onProgress?.(`Processando ${index + 1} de ${files.length}: ${file.name}`, Math.round(index / files.length * 100));
    const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
    if (operation === "metadata") { pdf.setTitle(""); pdf.setAuthor(""); pdf.setSubject(""); pdf.setKeywords([]); pdf.setCreator("LIM PDF"); pdf.setProducer("LIM PDF"); }
    if (operation === "number") { const font = await pdf.embedFont(StandardFonts.Helvetica); pdf.getPages().forEach((page, pageIndex) => page.drawText(String(pageIndex + 1), { x: page.getWidth() - 32, y: 18, size: 9, font, color: rgb(.25, .28, .33) })); }
    if (operation === "confidential") { const font = await pdf.embedFont(StandardFonts.HelveticaBold); pdf.getPages().forEach((page) => page.drawText("CONFIDENCIAL", { x: page.getWidth() * .23, y: page.getHeight() * .52, size: Math.max(26, Math.min(54, page.getWidth() / 10)), font, color: rgb(.82, .08, .08), opacity: .16 })); }
    if (operation === "structural") { try { pdf.getForm().flatten(); } catch { /* sem formulário */ } }
    entries.push({ name: `${safeBaseName(file)}-${operation}.pdf`, data: await pdf.save({ useObjectStreams: true }) });
  }
  return { blob: createStoredZip(entries), filename: "lim-pdf-lote.zip", count: entries.length };
}
