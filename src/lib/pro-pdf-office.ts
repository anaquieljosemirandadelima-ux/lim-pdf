import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createStoredZip } from "@/lib/browser-files";
import { canvasToBlob, loadPdfJsDocument } from "@/lib/pdf-render";
import { safeBaseName, type Progress } from "@/lib/pro-pdf-core";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_ZIP_ENTRIES = 6000;
const MAX_ZIP_ENTRY_UNCOMPRESSED = 120 * 1024 * 1024;
const MAX_ZIP_TOTAL_UNCOMPRESSED = 420 * 1024 * 1024;
const EMU_PER_POINT = 12700;

function u16(data: Uint8Array, offset: number) { return data[offset] | data[offset + 1] << 8; }
function u32(data: Uint8Array, offset: number) { return (data[offset] | data[offset + 1] << 8 | data[offset + 2] << 16 | data[offset + 3] << 24) >>> 0; }

async function inflateRaw(data: Uint8Array) {
  if (typeof DecompressionStream === "undefined") throw new Error("O navegador não oferece a descompactação necessária para PPTX.");
  const stream = new Blob([Uint8Array.from(data)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZipEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer); let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) if (u32(bytes, offset) === 0x06054b50) { end = offset; break; }
  if (end < 0) throw new Error("Arquivo Office inválido ou corrompido.");
  const count = u16(bytes, end + 10);
  if (count > MAX_ZIP_ENTRIES) throw new Error("O arquivo Office possui entradas demais para ser processado com segurança.");
  let cursor = u32(bytes, end + 16); let totalInflated = 0; const entries = new Map<string, Uint8Array>();
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length || u32(bytes, cursor) !== 0x02014b50) throw new Error("Estrutura ZIP inválida.");
    const method = u16(bytes, cursor + 10); const compressedSize = u32(bytes, cursor + 20); const declaredSize = u32(bytes, cursor + 24);
    const nameLength = u16(bytes, cursor + 28); const extraLength = u16(bytes, cursor + 30); const commentLength = u16(bytes, cursor + 32); const localOffset = u32(bytes, cursor + 42);
    if (declaredSize > MAX_ZIP_ENTRY_UNCOMPRESSED) throw new Error("Uma parte interna do arquivo Office é grande demais para processamento seguro.");
    totalInflated += declaredSize;
    if (totalInflated > MAX_ZIP_TOTAL_UNCOMPRESSED) throw new Error("O conteúdo descompactado do arquivo Office excede o limite de segurança.");
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    if (localOffset + 30 > bytes.length || u32(bytes, localOffset) !== 0x04034b50) throw new Error("Entrada ZIP inválida.");
    const localNameLength = u16(bytes, localOffset + 26); const localExtraLength = u16(bytes, localOffset + 28); const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > bytes.length) throw new Error("Entrada ZIP truncada.");
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    let content: Uint8Array;
    if (method === 0) content = Uint8Array.from(compressed);
    else if (method === 8) content = await inflateRaw(compressed);
    else throw new Error(`Método de compressão Office não suportado (${method}).`);
    if (content.length > MAX_ZIP_ENTRY_UNCOMPRESSED || content.length > Math.max(declaredSize + 1024, declaredSize * 1.02 + 1024)) throw new Error("Uma entrada Office expandiu além do tamanho declarado.");
    entries.set(name, content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function escapeXml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
function unescapeXml(value: string) { return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"); }
function themeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="LIM PDF"><a:themeElements><a:clrScheme name="LIM"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F2937"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="EF1010"/></a:accent1><a:accent2><a:srgbClr val="2563EB"/></a:accent2><a:accent3><a:srgbClr val="16A34A"/></a:accent3><a:accent4><a:srgbClr val="7C3AED"/></a:accent4><a:accent5><a:srgbClr val="F59E0B"/></a:accent5><a:accent6><a:srgbClr val="0D9488"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="LIM"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme><a:fmtScheme name="LIM"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
}

type PageImage = { bytes: Uint8Array; width: number; height: number };
function containBox(contentWidth: number, contentHeight: number, boxWidth: number, boxHeight: number) {
  const scale = Math.min(boxWidth / contentWidth, boxHeight / contentHeight);
  const width = contentWidth * scale; const height = contentHeight * scale;
  return { x: Math.round((boxWidth - width) / 2), y: Math.round((boxHeight - height) / 2), width: Math.round(width), height: Math.round(height) };
}

export async function pdfToPptx(file: File, onProgress?: Progress) {
  const source = await loadPdfJsDocument(await file.arrayBuffer()); const images: PageImage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Criando slide ${pageNumber} de ${source.numPages}`, Math.round((pageNumber - 1) / source.numPages * 90));
      const page = await source.getPage(pageNumber);
      try {
        const base = page.getViewport({ scale: 1 }); const scale = Math.min(1.8, Math.max(1, Math.sqrt(5_000_000 / Math.max(1, base.width * base.height)))); const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height); const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas indisponível para converter o PDF.");
        await page.render({ canvas, canvasContext: context, viewport }).promise; const blob = await canvasToBlob(canvas, "image/png"); images.push({ bytes: new Uint8Array(await blob.arrayBuffer()), width: base.width, height: base.height }); canvas.width = 1; canvas.height = 1;
      } finally { page.cleanup(); }
    }
  } finally { await source.cleanup(); }
  if (!images.length) throw new Error("PDF sem páginas.");
  const width = 9144000;
  const firstRatio = images[0].height / Math.max(1, images[0].width);
  const height = Math.max(2286000, Math.min(13716000, Math.round(width * firstRatio)));
  const slideOverrides = images.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
  const slideRels = images.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("");
  const slideIds = images.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("");
  const entries: { name: string; data: Uint8Array }[] = [
    { name: "[Content_Types].xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slideOverrides}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`) },
    { name: "_rels/.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>') },
    { name: "docProps/core.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(file.name)}</dc:title><dc:creator>LIM PDF</dc:creator></cp:coreProperties>`) },
    { name: "docProps/app.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>LIM PDF</Application><Slides>${images.length}</Slides></Properties>`) },
    { name: "ppt/presentation.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${width}" cy="${height}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`) },
    { name: "ppt/_rels/presentation.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slideRels}</Relationships>`) },
    { name: "ppt/slideMasters/slideMaster1.xml", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>') },
    { name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>') },
    { name: "ppt/slideLayouts/slideLayout1.xml", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>') },
    { name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>') },
    { name: "ppt/theme/theme1.xml", data: encoder.encode(themeXml()) },
  ];
  images.forEach((image, index) => {
    const n = index + 1; const box = containBox(image.width, image.height, width, height);
    entries.push({ name: `ppt/media/image${n}.png`, data: image.bytes });
    entries.push({ name: `ppt/slides/slide${n}.xml`, data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:pic><p:nvPicPr><p:cNvPr id="2" name="Página ${n}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.width}" cy="${box.height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`) });
    entries.push({ name: `ppt/slides/_rels/slide${n}.xml.rels`, data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${n}.png"/></Relationships>`) });
  });
  return { blob: createStoredZip(entries), filename: `${safeBaseName(file)}.pptx` };
}

function relMap(xml: string) {
  const map = new Map<string, string>();
  for (const match of xml.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?\s*>/g)) map.set(match[1], match[2]);
  return map;
}
function resolveSlidePath(target: string) { return target.replace(/^\.\//, "").replace(/^\//, "").startsWith("ppt/") ? target.replace(/^\//, "") : `ppt/${target.replace(/^\.\.\//, "")}`; }
function resolveMediaPath(target: string) { if (target.startsWith("/")) return target.slice(1); if (target.startsWith("../")) return `ppt/${target.slice(3)}`; return `ppt/slides/${target}`.replace(/\/[^/]+\/\.\//g, "/"); }
function orderedSlides(entries: Map<string, Uint8Array>) {
  const presentation = decoder.decode(entries.get("ppt/presentation.xml") || new Uint8Array());
  const rels = relMap(decoder.decode(entries.get("ppt/_rels/presentation.xml.rels") || new Uint8Array()));
  const ids = [...presentation.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"[^>]*\/?\s*>/g)].map((match) => match[1]);
  const ordered = ids.map((id) => rels.get(id)).filter((target): target is string => Boolean(target)).map(resolveSlidePath).filter((name) => entries.has(name));
  if (ordered.length) return ordered;
  return [...entries.keys()].filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/slide(\d+)\.xml$/)?.[1] || 0) - Number(b.match(/slide(\d+)\.xml$/)?.[1] || 0));
}
function slideDimensions(entries: Map<string, Uint8Array>) {
  const xml = decoder.decode(entries.get("ppt/presentation.xml") || new Uint8Array());
  const match = xml.match(/<p:sldSz\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  const width = Number(match?.[1] || 10668000); const height = Number(match?.[2] || 6000750);
  return { emuWidth: width, emuHeight: height, width: width / EMU_PER_POINT, height: height / EMU_PER_POINT };
}
function xfrm(xml: string) {
  const off = xml.match(/<a:off\b[^>]*x="(-?\d+)"[^>]*y="(-?\d+)"/); const ext = xml.match(/<a:ext\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  return off && ext ? { x: Number(off[1]), y: Number(off[2]), width: Number(ext[1]), height: Number(ext[2]) } : null;
}
function drawTextBlock(page: ReturnType<PDFDocument["addPage"]>, xml: string, regular: Awaited<ReturnType<PDFDocument["embedFont"]>>, bold: Awaited<ReturnType<PDFDocument["embedFont"]>>, dims: ReturnType<typeof slideDimensions>) {
  const values = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((match) => unescapeXml(match[1]).trim()).filter(Boolean);
  if (!values.length) return;
  const box = xfrm(xml) || { x: 457200, y: 457200, width: dims.emuWidth - 914400, height: dims.emuHeight - 914400 };
  const fontSizeRaw = Number(xml.match(/<a:(?:rPr|defRPr)\b[^>]*sz="(\d+)"/)?.[1] || 1600); const size = Math.max(7, Math.min(42, fontSizeRaw / 100));
  const x = box.x / EMU_PER_POINT; const top = dims.height - box.y / EMU_PER_POINT; const maxWidth = Math.max(20, box.width / EMU_PER_POINT);
  let y = top - size;
  for (let index = 0; index < values.length && y > 8; index += 1) {
    const value = values[index];
    try { page.drawText(value.slice(0, 1000), { x, y, size, font: index === 0 && /<a:rPr\b[^>]*\bb="1"/.test(xml) ? bold : regular, color: rgb(.08, .1, .15), maxWidth, lineHeight: size * 1.22 }); } catch { /* caracteres fora da fonte padrão */ }
    y -= size * 1.35;
  }
}

export async function pptxToPdf(file: File, onProgress?: Progress) {
  const entries = await readZipEntries(await file.arrayBuffer()); const slides = orderedSlides(entries);
  if (!slides.length) throw new Error("Nenhum slide PPTX foi encontrado.");
  const output = await PDFDocument.create(); const regular = await output.embedFont(StandardFonts.Helvetica); const bold = await output.embedFont(StandardFonts.HelveticaBold); const dims = slideDimensions(entries);
  for (let index = 0; index < slides.length; index += 1) {
    onProgress?.(`Convertendo slide ${index + 1} de ${slides.length}`, Math.round(index / slides.length * 90));
    const slideName = slides[index]; const xml = decoder.decode(entries.get(slideName)!); const page = output.addPage([dims.width, dims.height]); page.drawRectangle({ x: 0, y: 0, width: dims.width, height: dims.height, color: rgb(1, 1, 1) });
    const relName = slideName.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels"; const relationships = relMap(decoder.decode(entries.get(relName) || new Uint8Array()));
    for (const picture of xml.matchAll(/<p:pic\b[\s\S]*?<\/p:pic>/g)) {
      const fragment = picture[0]; const relationshipId = fragment.match(/<a:blip\b[^>]*r:embed="([^"]+)"/)?.[1]; if (!relationshipId) continue;
      const target = relationships.get(relationshipId); if (!target) continue; const path = resolveMediaPath(target); const bytes = entries.get(path); if (!bytes) continue;
      const box = xfrm(fragment); if (!box) continue;
      try {
        const image = /\.png$/i.test(path) ? await output.embedPng(bytes) : /\.(?:jpe?g)$/i.test(path) ? await output.embedJpg(bytes) : null; if (!image) continue;
        page.drawImage(image, { x: box.x / EMU_PER_POINT, y: dims.height - (box.y + box.height) / EMU_PER_POINT, width: box.width / EMU_PER_POINT, height: box.height / EMU_PER_POINT });
      } catch { /* mídia incompatível: mantém demais elementos */ }
    }
    for (const shape of xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)) drawTextBlock(page, shape[0], regular, bold, dims);
    for (const frame of xml.matchAll(/<p:graphicFrame\b[\s\S]*?<\/p:graphicFrame>/g)) drawTextBlock(page, frame[0], regular, bold, dims);
  }
  return { bytes: await output.save({ useObjectStreams: true }), filename: `${safeBaseName(file)}.pdf` };
}
