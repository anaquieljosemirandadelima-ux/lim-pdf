import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createStoredZip } from "@/lib/browser-files";
import { canvasToBlob, loadPdfJsDocument } from "@/lib/pdf-render";
import { safeBaseName, type Progress } from "@/lib/pro-pdf-core";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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
  const count = u16(bytes, end + 10); let cursor = u32(bytes, end + 16); const entries = new Map<string, Uint8Array>();
  for (let index = 0; index < count; index += 1) {
    if (u32(bytes, cursor) !== 0x02014b50) throw new Error("Estrutura ZIP inválida.");
    const method = u16(bytes, cursor + 10); const compressedSize = u32(bytes, cursor + 20); const nameLength = u16(bytes, cursor + 28); const extraLength = u16(bytes, cursor + 30); const commentLength = u16(bytes, cursor + 32); const localOffset = u32(bytes, cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = u16(bytes, localOffset + 26); const localExtraLength = u16(bytes, localOffset + 28); const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (content) entries.set(name, content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function escapeXml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function themeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="LIM PDF"><a:themeElements><a:clrScheme name="LIM"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F2937"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="EF1010"/></a:accent1><a:accent2><a:srgbClr val="2563EB"/></a:accent2><a:accent3><a:srgbClr val="16A34A"/></a:accent3><a:accent4><a:srgbClr val="7C3AED"/></a:accent4><a:accent5><a:srgbClr val="F59E0B"/></a:accent5><a:accent6><a:srgbClr val="0D9488"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="LIM"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme><a:fmtScheme name="LIM"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
}

export async function pdfToPptx(file: File, onProgress?: Progress) {
  const source = await loadPdfJsDocument(await file.arrayBuffer()); const images: Uint8Array[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Criando slide ${pageNumber} de ${source.numPages}`, Math.round((pageNumber - 1) / source.numPages * 90));
      const page = await source.getPage(pageNumber);
      try {
        const base = page.getViewport({ scale: 1 }); const scale = Math.min(1.8, Math.max(1, Math.sqrt(5_000_000 / Math.max(1, base.width * base.height)))); const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height); const context = canvas.getContext("2d", { alpha: false })!;
        await page.render({ canvas, canvasContext: context, viewport }).promise; const blob = await canvasToBlob(canvas, "image/png"); images.push(new Uint8Array(await blob.arrayBuffer())); canvas.width = 1;
      } finally { page.cleanup(); }
    }
  } finally { await source.cleanup(); }
  if (!images.length) throw new Error("PDF sem páginas.");
  const width = 9144000; const height = 6858000;
  const slideOverrides = images.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
  const slideRels = images.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("");
  const slideIds = images.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("");
  const entries: { name: string; data: Uint8Array }[] = [
    { name: "[Content_Types].xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slideOverrides}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`) },
    { name: "_rels/.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>') },
    { name: "docProps/core.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(file.name)}</dc:title><dc:creator>LIM PDF</dc:creator></cp:coreProperties>`) },
    { name: "docProps/app.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>LIM PDF</Application><Slides>${images.length}</Slides></Properties>`) },
    { name: "ppt/presentation.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${width}" cy="${height}" type="screen4x3"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`) },
    { name: "ppt/_rels/presentation.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slideRels}</Relationships>`) },
    { name: "ppt/slideMasters/slideMaster1.xml", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>') },
    { name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>') },
    { name: "ppt/slideLayouts/slideLayout1.xml", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>') },
    { name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>') },
    { name: "ppt/theme/theme1.xml", data: encoder.encode(themeXml()) },
  ];
  images.forEach((image, index) => {
    const n = index + 1;
    entries.push({ name: `ppt/media/image${n}.png`, data: image });
    entries.push({ name: `ppt/slides/slide${n}.xml`, data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:pic><p:nvPicPr><p:cNvPr id="2" name="Página ${n}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`) });
    entries.push({ name: `ppt/slides/_rels/slide${n}.xml.rels`, data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${n}.png"/></Relationships>`) });
  });
  return { blob: createStoredZip(entries), filename: `${safeBaseName(file)}.pptx` };
}

function slideNumber(name: string) { return Number(name.match(/slide(\d+)\.xml$/)?.[1] || 0); }

export async function pptxToPdf(file: File, onProgress?: Progress) {
  const entries = await readZipEntries(await file.arrayBuffer());
  const slides = [...entries.keys()].filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => slideNumber(a) - slideNumber(b));
  if (!slides.length) throw new Error("Nenhum slide PPTX foi encontrado.");
  const output = await PDFDocument.create(); const regular = await output.embedFont(StandardFonts.Helvetica); const bold = await output.embedFont(StandardFonts.HelveticaBold);
  for (let index = 0; index < slides.length; index += 1) {
    onProgress?.(`Convertendo slide ${index + 1} de ${slides.length}`, Math.round(index / slides.length * 90));
    const slideName = slides[index]; const xml = decoder.decode(entries.get(slideName)!); const page = output.addPage([842, 595]);
    const relName = slideName.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels"; const relBytes = entries.get(relName); const relXml = relBytes ? decoder.decode(relBytes) : "";
    const imageTargets = [...relXml.matchAll(/Type="[^"]*\/image"[^>]*Target="([^"]+)"/g)].map((match) => match[1]);
    let drewImage = false;
    for (const target of imageTargets.slice(0, 1)) {
      const normalized = target.startsWith("../") ? `ppt/${target.slice(3)}` : `ppt/slides/${target}`; const bytes = entries.get(normalized); if (!bytes) continue;
      try { const image = /\.png$/i.test(normalized) ? await output.embedPng(bytes) : await output.embedJpg(bytes); page.drawImage(image, { x: 0, y: 0, width: 842, height: 595 }); drewImage = true; } catch { /* usa fallback textual */ }
    }
    if (!drewImage) {
      page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(1, 1, 1) });
      const texts = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((match) => match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()).filter(Boolean);
      let y = 540;
      texts.forEach((text, textIndex) => { if (y < 40) return; const size = textIndex === 0 ? 24 : 15; try { page.drawText(text.slice(0, 180), { x: 45, y, size, font: textIndex === 0 ? bold : regular, color: rgb(.08, .1, .15), maxWidth: 750 }); } catch { /* caracteres não suportados na fonte padrão */ } y -= size + 18; });
    }
  }
  return { bytes: await output.save(), filename: `${safeBaseName(file)}.pdf` };
}
