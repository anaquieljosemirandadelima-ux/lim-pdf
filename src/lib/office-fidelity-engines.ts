import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createStoredZip } from "@/lib/browser-files";
import { canvasToBlob, loadPdfJsDocument } from "@/lib/pdf-render";
import { readZipEntries } from "@/lib/pro-pdf-office";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Progress = (message: string, percent?: number) => void;
type PdfTextItem = { str?: string; width?: number; height?: number; transform?: number[] };
type PdfLine = { y: number; items: Array<{ text: string; x: number; width: number; size: number }> };

function baseName(file: File) { return file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "lim-pdf"; }
function xml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function safePdfText(value: string) { return value.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?"); }

function groupLines(items: PdfTextItem[]) {
  const normalized = items.flatMap((item) => {
    const text = item.str?.trim(); const transform = item.transform;
    if (!text || !transform || transform.length < 6) return [];
    const size = Math.max(7, Math.hypot(transform[0] || 0, transform[1] || 0));
    return [{ text, x: Number(transform[4] || 0), y: Number(transform[5] || 0), width: Math.max(1, Number(item.width || text.length * size * .48)), size }];
  }).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfLine[] = [];
  for (const item of normalized) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= Math.max(2.5, item.size * .32));
    if (line) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  lines.forEach((line) => line.items.sort((a, b) => a.x - b.x));
  return lines.sort((a, b) => b.y - a.y);
}

async function pdfPageData(file: File, onProgress?: Progress) {
  const source = await loadPdfJsDocument(await file.arrayBuffer());
  const pages: Array<{ width: number; height: number; lines: PdfLine[]; image?: Uint8Array }> = [];
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Lendo página ${pageNumber} de ${source.numPages}`, Math.round((pageNumber - 1) / source.numPages * 80));
      const page = await source.getPage(pageNumber);
      try {
        const base = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        pages.push({ width: base.width, height: base.height, lines: groupLines(content.items as PdfTextItem[]) });
      } finally { page.cleanup(); }
    }
  } finally { await source.cleanup(); }
  return pages;
}

async function renderPdfPageImages(file: File, onProgress?: Progress) {
  const source = await loadPdfJsDocument(await file.arrayBuffer());
  const pages: Array<{ data: Uint8Array; width: number; height: number }> = [];
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(`Renderizando página ${pageNumber} de ${source.numPages}`, Math.round((pageNumber - 1) / source.numPages * 85));
      const page = await source.getPage(pageNumber);
      try {
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(1.75, Math.max(1, Math.sqrt(5_500_000 / Math.max(1, base.width * base.height))));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { alpha: false })!;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const blob = await canvasToBlob(canvas, "image/png"); pages.push({ data: new Uint8Array(await blob.arrayBuffer()), width: base.width, height: base.height }); canvas.width = 1;
      } finally { page.cleanup(); }
    }
  } finally { await source.cleanup(); }
  return pages;
}

function docxCommon(contentTypesExtra = "", documentRels = "") {
  return [
    { name: "[Content_Types].xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${contentTypesExtra}</Types>`) },
    { name: "_rels/.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>') },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${documentRels}</Relationships>`) },
    { name: "word/styles.xml", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/></w:rPr></w:style></w:styles>') },
    { name: "docProps/core.xml", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>LIM PDF</dc:creator><dc:title>Conversão LIM PDF</dc:title></cp:coreProperties>') },
  ];
}

export async function pdfToDocxFidelity(file: File, mode: "editable" | "visual", onProgress?: Progress) {
  if (mode === "visual") {
    const pages = await renderPdfPageImages(file, onProgress);
    const rels = pages.map((_, index) => `<Relationship Id="rIdImg${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page-${index + 1}.png"/>`).join("");
    const body = pages.map((page, index) => {
      const maxW = 6.8; const maxH = 9.4; const ratio = page.width / page.height; let w = maxW; let h = w / ratio; if (h > maxH) { h = maxH; w = h * ratio; }
      const cx = Math.round(w * 914400); const cy = Math.round(h * 914400);
      return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${index + 1}" name="Página ${index + 1}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${index + 1}" name="Página ${index + 1}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rIdImg${index + 1}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>${index < pages.length - 1 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : ''}`;
    }).join("");
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="360" w:right="360" w:bottom="360" w:left="360"/></w:sectPr></w:body></w:document>`;
    const entries = [...docxCommon("", rels), { name: "word/document.xml", data: encoder.encode(documentXml) }, ...pages.map((page, index) => ({ name: `word/media/page-${index + 1}.png`, data: page.data }))];
    return { blob: createStoredZip(entries), filename: `${baseName(file)}-visual.docx`, report: ["Modo fidelidade visual: cada página foi preservada como imagem de alta resolução no DOCX.", "Para editar texto livremente, use o modo editável."] };
  }

  const pages = await pdfPageData(file, onProgress);
  const body = pages.map((page, pageIndex) => {
    const paragraphs = page.lines.map((line) => {
      const runs: string[] = []; let previousRight = 0;
      for (const item of line.items) {
        const gap = item.x - previousRight; const spaces = previousRight && gap > item.size * .55 ? Math.min(8, Math.max(1, Math.round(gap / Math.max(3, item.size * .45)))) : 0;
        const text = `${spaces ? " ".repeat(spaces) : ""}${item.text}`;
        const halfPoints = Math.max(14, Math.min(96, Math.round(item.size * 2)));
        runs.push(`<w:r><w:rPr><w:sz w:val="${halfPoints}"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r>`);
        previousRight = item.x + item.width;
      }
      return `<w:p><w:pPr><w:spacing w:after="20"/></w:pPr>${runs.join("")}</w:p>`;
    }).join("");
    return `${paragraphs}${pageIndex < pages.length - 1 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : ''}`;
  }).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`;
  const entries = [...docxCommon(), { name: "word/document.xml", data: encoder.encode(documentXml) }];
  return { blob: createStoredZip(entries), filename: `${baseName(file)}.docx`, report: ["Texto agrupado por linhas e páginas com tamanhos de fonte aproximados.", "Elementos vetoriais complexos podem exigir o modo fidelidade visual."] };
}

function columnName(index: number) { let value = index + 1; let out = ""; while (value) { const mod = (value - 1) % 26; out = String.fromCharCode(65 + mod) + out; value = Math.floor((value - 1) / 26); } return out; }
function inferColumns(lines: PdfLine[]) {
  const xs = lines.flatMap((line) => line.items.map((item) => item.x)).sort((a, b) => a - b);
  const columns: number[] = [];
  for (const x of xs) {
    const existing = columns.findIndex((value) => Math.abs(value - x) < 24);
    if (existing >= 0) columns[existing] = (columns[existing] + x) / 2;
    else columns.push(x);
  }
  return columns.sort((a, b) => a - b);
}

export async function pdfToXlsxFidelity(file: File, onProgress?: Progress) {
  const pages = await pdfPageData(file, onProgress);
  const overrides = pages.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const workbookSheets = pages.map((_, index) => `<sheet name="Página ${index + 1}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const workbookRels = pages.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  const entries: { name: string; data: Uint8Array }[] = [
    { name: "[Content_Types].xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`) },
    { name: "_rels/.rels", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
    { name: "xl/workbook.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
    { name: "xl/styles.xml", data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Aptos"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>') },
  ];
  pages.forEach((page, pageIndex) => {
    const columns = inferColumns(page.lines);
    const rows = page.lines.map((line, rowIndex) => {
      const cells = new Map<number, string[]>();
      line.items.forEach((item) => {
        let col = 0; let distance = Infinity;
        columns.forEach((value, index) => { const next = Math.abs(value - item.x); if (next < distance) { distance = next; col = index; } });
        const values = cells.get(col) || []; values.push(item.text); cells.set(col, values);
      });
      const xmlCells = [...cells.entries()].sort((a, b) => a[0] - b[0]).map(([column, values]) => `<c r="${columnName(column)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(values.join(" "))}</t></is></c>`).join("");
      return `<row r="${rowIndex + 1}">${xmlCells}</row>`;
    }).join("");
    const widths = columns.map((value, index) => { const next = columns[index + 1] ?? value + 90; return `<col min="${index + 1}" max="${index + 1}" width="${Math.max(8, Math.min(40, (next - value) / 7))}" customWidth="1"/>`; }).join("");
    entries.push({ name: `xl/worksheets/sheet${pageIndex + 1}.xml`, data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${widths}</cols><sheetData>${rows}</sheetData></worksheet>`) });
  });
  return { blob: createStoredZip(entries), filename: `${baseName(file)}.xlsx`, report: ["Linhas e colunas inferidas a partir da geometria real do texto do PDF.", `${pages.length} aba(s) criada(s), uma por página.`] };
}

function wordText(block: Element) { return Array.from(block.getElementsByTagNameNS("*", "t")).map((node) => node.textContent || "").join(""); }
function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean); const lines: string[] = []; let current = "";
  for (const word of words) { const candidate = current ? `${current} ${word}` : word; if (candidate.length > maxChars && current) { lines.push(current); current = word; } else current = candidate; }
  if (current) lines.push(current); return lines;
}

export async function docxToPdfFidelity(file: File, onProgress?: Progress) {
  const entries = await readZipEntries(await file.arrayBuffer());
  const documentBytes = entries.get("word/document.xml"); if (!documentBytes) throw new Error("DOCX sem word/document.xml.");
  const parser = new DOMParser(); const documentXml = parser.parseFromString(decoder.decode(documentBytes), "application/xml");
  const body = documentXml.getElementsByTagNameNS("*", "body")[0]; if (!body) throw new Error("Corpo do DOCX não encontrado.");
  const relsBytes = entries.get("word/_rels/document.xml.rels"); const rels = relsBytes ? parser.parseFromString(decoder.decode(relsBytes), "application/xml") : null;
  const relationshipMap = new Map<string, string>(); rels?.querySelectorAll("Relationship").forEach((rel) => relationshipMap.set(rel.getAttribute("Id") || "", rel.getAttribute("Target") || ""));
  const pdf = await PDFDocument.create(); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 790; const margin = 46;
  const newPage = () => { page = pdf.addPage([595, 842]); y = 790; };
  const drawLine = (text: string, size = 11, strong = false) => { if (y < 55) newPage(); try { page.drawText(safePdfText(text), { x: margin, y, size, font: strong ? bold : regular, color: rgb(.08, .1, .15), maxWidth: 500 }); } catch { /* segue */ } y -= size + 6; };
  const children = Array.from(body.children);
  for (let index = 0; index < children.length; index += 1) {
    onProgress?.(`Interpretando bloco ${index + 1} de ${children.length}`, Math.round(index / Math.max(1, children.length) * 85));
    const block = children[index]; const tag = block.localName;
    if (tag === "p") {
      const text = wordText(block).trim();
      const isBold = Boolean(block.querySelector("b"));
      const sizeNode = block.querySelector("sz"); const size = sizeNode ? Math.max(8, Math.min(28, Number(sizeNode.getAttribute("val") || 22) / 2)) : 11;
      if (text) wrapText(text, Math.max(30, Math.floor(92 * 11 / size))).forEach((line) => drawLine(line, size, isBold)); else y -= 8;
      if (block.querySelector('br[type="page"], br[w\\:type="page"]')) newPage();
      const blip = block.querySelector("blip"); const relId = blip?.getAttribute("r:embed") || blip?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed");
      if (relId) {
        const target = relationshipMap.get(relId); const normalized = target?.startsWith("../") ? `word/${target.slice(3)}` : target ? `word/${target}` : ""; const imageBytes = normalized ? entries.get(normalized) : undefined;
        if (imageBytes) {
          try {
            const image = /\.png$/i.test(normalized) ? await pdf.embedPng(imageBytes) : await pdf.embedJpg(imageBytes); const dims = image.scale(1); const scale = Math.min(500 / dims.width, 400 / dims.height, 1); const h = dims.height * scale;
            if (y - h < 50) newPage(); page.drawImage(image, { x: margin, y: y - h, width: dims.width * scale, height: h }); y -= h + 10;
          } catch { /* formato de imagem não suportado */ }
        }
      }
    } else if (tag === "tbl") {
      const rows = Array.from(block.getElementsByTagNameNS("*", "tr"));
      for (const row of rows) {
        const cells = Array.from(row.getElementsByTagNameNS("*", "tc")).map((cell) => wordText(cell).trim());
        drawLine(cells.join("   |   "), 9, false);
      }
      y -= 8;
    }
  }
  return { bytes: await pdf.save(), filename: `${baseName(file)}.pdf`, report: ["Parágrafos, quebras de página, tabelas e imagens raster compatíveis foram reconstruídos localmente.", "SmartArt, fórmulas avançadas e objetos OLE não são executados pelo navegador."] };
}

function sharedStrings(entries: Map<string, Uint8Array>) {
  const bytes = entries.get("xl/sharedStrings.xml"); if (!bytes) return [];
  const doc = new DOMParser().parseFromString(decoder.decode(bytes), "application/xml");
  return Array.from(doc.getElementsByTagNameNS("*", "si")).map((node) => Array.from(node.getElementsByTagNameNS("*", "t")).map((item) => item.textContent || "").join(""));
}
function cellColumn(reference: string) { const letters = reference.match(/[A-Z]+/)?.[0] || "A"; let value = 0; for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64; return value - 1; }

export async function xlsxToPdfFidelity(file: File, onProgress?: Progress) {
  const entries = await readZipEntries(await file.arrayBuffer()); const strings = sharedStrings(entries);
  const sheets = [...entries.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/sheet(\d+)/)?.[1]) - Number(b.match(/sheet(\d+)/)?.[1]));
  if (!sheets.length) throw new Error("XLSX sem planilhas legíveis.");
  const output = await PDFDocument.create(); const font = await output.embedFont(StandardFonts.Helvetica); const bold = await output.embedFont(StandardFonts.HelveticaBold); const parser = new DOMParser();
  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex += 1) {
    onProgress?.(`Convertendo planilha ${sheetIndex + 1} de ${sheets.length}`, Math.round(sheetIndex / sheets.length * 85));
    const doc = parser.parseFromString(decoder.decode(entries.get(sheets[sheetIndex])!), "application/xml"); const rows = Array.from(doc.getElementsByTagNameNS("*", "row"));
    let page = output.addPage([842, 595]); let y = 545; const left = 32; const rowHeight = 20; const colWidth = 115;
    page.drawText(`Planilha ${sheetIndex + 1}`, { x: left, y: 568, size: 11, font: bold, color: rgb(.12, .15, .2) });
    for (const row of rows) {
      if (y < 35) { page = output.addPage([842, 595]); y = 550; }
      const cells = Array.from(row.getElementsByTagNameNS("*", "c"));
      for (const cell of cells) {
        const ref = cell.getAttribute("r") || "A1"; const col = cellColumn(ref); if (col > 6) continue;
        const type = cell.getAttribute("t"); const v = cell.getElementsByTagNameNS("*", "v")[0]?.textContent || ""; const inline = cell.getElementsByTagNameNS("*", "t")[0]?.textContent || "";
        const value = type === "s" ? strings[Number(v)] || "" : type === "inlineStr" ? inline : v;
        const x = left + col * colWidth; page.drawRectangle({ x, y: y - 4, width: colWidth, height: rowHeight, borderWidth: .4, borderColor: rgb(.82, .84, .87), color: rgb(1, 1, 1) });
        if (value) try { page.drawText(safePdfText(value).slice(0, 26), { x: x + 4, y: y + 2, size: 8, font, color: rgb(.08, .1, .15), maxWidth: colWidth - 8 }); } catch { /* segue */ }
      }
      y -= rowHeight;
    }
  }
  return { bytes: await output.save(), filename: `${baseName(file)}.pdf`, report: ["Valores e estrutura tabular foram reconstruídos em páginas PDF.", "Fórmulas são representadas pelos valores armazenados no XLSX quando disponíveis."] };
}
