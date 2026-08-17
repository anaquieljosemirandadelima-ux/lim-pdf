"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";
import { createStoredZip, downloadBlob, downloadBytes, humanSize } from "@/lib/browser-files";
import { loadPdfJsDocument } from "@/lib/pdf-render";
import { formatFileSizeLimit, getDeviceMemoryGuidance, getFileSizeGuidance, isFileWithinLimit, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";
import type { AdvancedToolSlug, AnyToolDefinition } from "@/lib/all-tools";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Status =
  | { type: "idle" }
  | { type: "processing"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

type PositionedText = { text: string; x: number; y: number; width: number; height: number };
type PdfFontLike = { widthOfTextAtSize(text: string, size: number): number };

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlDecode(value: string) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function sanitizePdfText(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, "?");
}

function baseName(file: File) {
  return file.name.replace(/\.[^.]+$/, "");
}

function readU16(data: Uint8Array, offset: number) {
  return data[offset] | (data[offset + 1] << 8);
}

function readU32(data: Uint8Array, offset: number) {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
}

async function inflateRaw(data: Uint8Array) {
  if (typeof DecompressionStream === "undefined") throw new Error("Seu navegador não oferece descompactação necessária para arquivos Office.");
  const stream = new Blob([Uint8Array.from(data).buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let endOffset = -1;
  const lowerBound = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= lowerBound; offset -= 1) {
    if (readU32(bytes, offset) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error("Arquivo Office inválido ou corrompido.");

  const entryCount = readU16(bytes, endOffset + 10);
  let cursor = readU32(bytes, endOffset + 16);
  const entries = new Map<string, Uint8Array>();

  for (let index = 0; index < entryCount; index += 1) {
    if (readU32(bytes, cursor) !== 0x02014b50) throw new Error("Estrutura ZIP inválida.");
    const method = readU16(bytes, cursor + 10);
    const compressedSize = readU32(bytes, cursor + 20);
    const fileNameLength = readU16(bytes, cursor + 28);
    const extraLength = readU16(bytes, cursor + 30);
    const commentLength = readU16(bytes, cursor + 32);
    const localOffset = readU32(bytes, cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + fileNameLength));

    if (readU32(bytes, localOffset) !== 0x04034b50) throw new Error("Entrada ZIP inválida.");
    const localNameLength = readU16(bytes, localOffset + 26);
    const localExtraLength = readU16(bytes, localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (content) entries.set(name, content);

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

async function pdfTextRows(file: File) {
  const pdf = await loadPdfJsDocument(await file.arrayBuffer());
  const pages: PositionedText[][][] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const items: PositionedText[] = content.items.flatMap((item) => {
          if (!("str" in item) || !item.str.trim() || !("transform" in item)) return [];
          return [{
            text: item.str.trim(),
            x: item.transform[4],
            y: item.transform[5],
            width: "width" in item ? item.width : 0,
            height: "height" in item ? Math.max(8, item.height) : 10,
          }];
        });
        items.sort((a, b) => Math.abs(a.y - b.y) > 4 ? b.y - a.y : a.x - b.x);
        const rows: PositionedText[][] = [];
        for (const item of items) {
          const row = rows.find((candidate) => candidate.length && Math.abs(candidate[0].y - item.y) <= 4);
          if (row) row.push(item); else rows.push([item]);
        }
        rows.forEach((row) => row.sort((a, b) => a.x - b.x));
        pages.push(rows);
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await pdf.cleanup();
  }
  return pages;
}

function docxBlob(pages: PositionedText[][][]) {
  const body = pages.map((rows, pageIndex) => {
    const paragraphs = rows.map((row) => {
      const text = row.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
      return `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
    }).join("");
    const pageBreak = pageIndex < pages.length - 1 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : "";
    return paragraphs + pageBreak;
  }).join("");

  const entries = [
    {
      name: "[Content_Types].xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'),
    },
    {
      name: "_rels/.rels",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'),
    },
    {
      name: "word/document.xml",
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`),
    },
    {
      name: "word/_rels/document.xml.rels",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'),
    },
    {
      name: "docProps/core.xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Documento convertido pelo LIM PDF</dc:title><dc:creator>LIM PDF</dc:creator></cp:coreProperties>'),
    },
    {
      name: "docProps/app.xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>LIM PDF</Application></Properties>'),
    },
  ];
  return createStoredZip(entries);
}

function columnName(index: number) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function xlsxBlob(pages: PositionedText[][][]) {
  const sheets = pages.map((rows, pageIndex) => {
    const rowXml = rows.map((row, rowIndex) => {
      const cells = row.map((item, cellIndex) => `<c r="${columnName(cellIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(item.text)}</t></is></c>`).join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join("");
    return {
      name: `xl/worksheets/sheet${pageIndex + 1}.xml`,
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`),
    };
  });
  const workbookSheets = pages.map((_, index) => `<sheet name="Página ${index + 1}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const relationships = pages.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  const overrides = pages.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");

  return createStoredZip([
    {
      name: "[Content_Types].xml",
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`),
    },
    {
      name: "_rels/.rels",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    },
    {
      name: "xl/workbook.xml",
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`),
    },
    ...sheets,
  ]);
}

function wrapText(text: string, font: PdfFontLike, size: number, maxWidth: number) {
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function paragraphsFromDocx(xml: string) {
  return (xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || []).map((paragraph) => {
    const pageBreak = /<w:br\b[^>]*w:type=["']page["'][^>]*\/>/.test(paragraph);
    const normalized = paragraph.replace(/<w:tab\b[^>]*\/>/g, "\t").replace(/<w:br\b[^>]*\/>/g, "\n");
    const text = (normalized.match(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g) || [])
      .map((node) => xmlDecode(node.replace(/^<w:t\b[^>]*>/, "").replace(/<\/w:t>$/, "")))
      .join("");
    return { text, pageBreak };
  });
}

async function docxToPdf(file: File) {
  const entries = await readZipEntries(await file.arrayBuffer());
  const documentXml = entries.get("word/document.xml");
  if (!documentXml) throw new Error("Este DOCX não contém um documento Word reconhecível.");
  const paragraphs = paragraphsFromDocx(decoder.decode(documentXml));
  const pdfLib = await import("pdf-lib");
  const pdf = await pdfLib.PDFDocument.create();
  const font = await pdf.embedFont(pdfLib.StandardFonts.Helvetica);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const fontSize = 11;
  const lineHeight = 16;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const nextPage = () => { page = pdf.addPage([pageWidth, pageHeight]); y = pageHeight - margin; };
  for (const paragraph of paragraphs) {
    if (paragraph.pageBreak && y < pageHeight - margin) nextPage();
    const lines = wrapText(paragraph.text, font, fontSize, pageWidth - margin * 2);
    for (const line of lines) {
      if (y < margin + lineHeight) nextPage();
      if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: pdfLib.rgb(0.08, 0.09, 0.11) });
      y -= lineHeight;
    }
    y -= 5;
  }
  return pdf.save({ useObjectStreams: true });
}

function sharedStringsFromXlsx(xml: string | undefined) {
  if (!xml) return [];
  return (xml.match(/<si\b[\s\S]*?<\/si>/g) || []).map((item) => (item.match(/<t\b[^>]*>[\s\S]*?<\/t>/g) || [])
    .map((node) => xmlDecode(node.replace(/^<t\b[^>]*>/, "").replace(/<\/t>$/, "")))
    .join(""));
}

function cellColumn(ref: string) {
  const letters = ref.match(/[A-Z]+/i)?.[0]?.toUpperCase() || "A";
  let value = 0;
  for (const char of letters) value = value * 26 + char.charCodeAt(0) - 64;
  return Math.max(0, value - 1);
}

function rowsFromSheet(xml: string, shared: string[]) {
  return (xml.match(/<row\b[\s\S]*?<\/row>/g) || []).map((row) => {
    const values: string[] = [];
    for (const match of row.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = match[1];
      const body = match[2];
      const ref = attrs.match(/\br=["']([^"']+)["']/)?.[1] || "A1";
      const type = attrs.match(/\bt=["']([^"']+)["']/)?.[1] || "";
      let value = "";
      if (type === "inlineStr") {
        value = (body.match(/<t\b[^>]*>[\s\S]*?<\/t>/g) || []).map((node) => xmlDecode(node.replace(/^<t\b[^>]*>/, "").replace(/<\/t>$/, ""))).join("");
      } else {
        const raw = xmlDecode(body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] || "");
        value = type === "s" ? shared[Number(raw)] || raw : raw;
      }
      values[cellColumn(ref)] = value;
    }
    return values;
  });
}

async function xlsxToPdf(file: File) {
  const entries = await readZipEntries(await file.arrayBuffer());
  const shared = sharedStringsFromXlsx(entries.get("xl/sharedStrings.xml") ? decoder.decode(entries.get("xl/sharedStrings.xml")!) : undefined);
  const sheets = [...entries.entries()]
    .filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  if (!sheets.length) throw new Error("Nenhuma planilha foi encontrada no XLSX.");

  const pdfLib = await import("pdf-lib");
  const pdf = await pdfLib.PDFDocument.create();
  const font = await pdf.embedFont(pdfLib.StandardFonts.Helvetica);
  const bold = await pdf.embedFont(pdfLib.StandardFonts.HelveticaBold);
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 28;
  const rowHeight = 18;
  const fontSize = 8;

  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex += 1) {
    const rows = rowsFromSheet(decoder.decode(sheets[sheetIndex][1]), shared);
    const maxColumns = Math.max(1, ...rows.map((row) => row.length));
    const visibleColumns = Math.min(maxColumns, 12);
    const cellWidth = (pageWidth - margin * 2) / visibleColumns;
    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    page.drawText(`Planilha ${sheetIndex + 1}`, { x: margin, y, size: 12, font: bold, color: pdfLib.rgb(0.1, 0.12, 0.16) });
    y -= 24;

    for (const row of rows) {
      if (y < margin + rowHeight) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      for (let column = 0; column < visibleColumns; column += 1) {
        const x = margin + column * cellWidth;
        page.drawRectangle({ x, y: y - 4, width: cellWidth, height: rowHeight, borderColor: pdfLib.rgb(0.85, 0.87, 0.9), borderWidth: 0.5 });
        const text = sanitizePdfText(row[column] || "");
        let shown = text;
        while (shown.length > 1 && font.widthOfTextAtSize(shown, fontSize) > cellWidth - 6) shown = shown.slice(0, -1);
        if (shown !== text && shown.length > 2) shown = `${shown.slice(0, -2)}…`;
        if (shown) page.drawText(shown, { x: x + 3, y, size: fontSize, font, color: pdfLib.rgb(0.12, 0.14, 0.18) });
      }
      y -= rowHeight;
    }
  }
  return pdf.save({ useObjectStreams: true });
}

async function highlightPdf(file: File, query: string) {
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  if (!needle) throw new Error("Digite o texto que deseja destacar.");
  const bytes = await file.arrayBuffer();
  const pdfJs = await loadPdfJsDocument(bytes.slice(0));
  const pdfLib = await import("pdf-lib");
  const output = await pdfLib.PDFDocument.load(bytes.slice(0));
  let matches = 0;
  try {
    for (let pageNumber = 1; pageNumber <= pdfJs.numPages; pageNumber += 1) {
      const page = await pdfJs.getPage(pageNumber);
      try {
        const text = await page.getTextContent();
        for (const item of text.items) {
          if (!("str" in item) || !("transform" in item) || !item.str.toLocaleLowerCase("pt-BR").includes(needle)) continue;
          const pdfPage = output.getPage(pageNumber - 1);
          const height = "height" in item ? Math.max(8, item.height) : 10;
          const width = Math.max(8, item.width);
          pdfPage.drawRectangle({
            x: item.transform[4] - 1,
            y: item.transform[5] - height * 0.25,
            width: width + 2,
            height: height * 1.05,
            color: pdfLib.rgb(1, 0.86, 0.18),
            opacity: 0.32,
          });
          matches += 1;
        }
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await pdfJs.cleanup();
  }
  if (!matches) throw new Error("Nenhuma ocorrência foi encontrada na camada de texto deste PDF.");
  return { bytes: await output.save({ useObjectStreams: true }), matches };
}

async function confidentialPdf(file: File) {
  const pdfLib = await import("pdf-lib");
  const pdf = await pdfLib.PDFDocument.load(await file.arrayBuffer());
  const font = await pdf.embedFont(pdfLib.StandardFonts.HelveticaBold);
  for (const page of pdf.getPages()) {
    const label = "CONFIDENCIAL";
    const size = Math.min(54, Math.max(28, page.getWidth() / 9));
    const width = font.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: (page.getWidth() - width * 0.82) / 2,
      y: page.getHeight() / 2,
      size,
      font,
      rotate: pdfLib.degrees(35),
      color: pdfLib.rgb(0.86, 0.06, 0.06),
      opacity: 0.14,
    });
    page.drawText("Documento confidencial", { x: 28, y: 18, size: 8, font, color: pdfLib.rgb(0.55, 0.12, 0.12), opacity: 0.7 });
  }
  return pdf.save({ useObjectStreams: true });
}

export function AdvancedToolWorkspace({ tool }: { tool: AnyToolDefinition }) {
  const slug = tool.slug as AdvancedToolSlug;
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [highlightQuery, setHighlightQuery] = useState("");
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);
  const [allowModifying, setAllowModifying] = useState(false);

  const acceptedLabel = useMemo(() => {
    if (slug === "word-para-pdf") return "DOCX";
    if (slug === "excel-para-pdf") return "XLSX";
    return "PDF";
  }, [slug]);

  const selectFile = useCallback((next: File | undefined) => {
    if (!next) return;
    if (!isFileWithinLimit(next, MAX_LOCAL_PDF_BYTES)) { setStatus({ type: "error", message: `O arquivo ultrapassa o limite de ${formatFileSizeLimit()}.` }); return; }
    const lower = next.name.toLowerCase();
    const valid = slug === "word-para-pdf" ? lower.endsWith(".docx") : slug === "excel-para-pdf" ? lower.endsWith(".xlsx") : lower.endsWith(".pdf") || next.type === "application/pdf";
    if (!valid) { setStatus({ type: "error", message: `Selecione um arquivo ${acceptedLabel}.` }); return; }
    setFile(next);
    setStatus({ type: "idle" });
  }, [acceptedLabel, slug]);

  async function pastePdfFromClipboard() {
    if (acceptedLabel !== "PDF" || !navigator.clipboard?.read) {
      setStatus({ type: "error", message: "O clipboard está disponível apenas para ferramentas PDF neste navegador." });
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const item = items.find((entry) => entry.types.includes("application/pdf"));
      if (!item) { setStatus({ type: "error", message: "Nenhum PDF foi encontrado no clipboard." }); return; }
      const blob = await item.getType("application/pdf");
      selectFile(new File([blob], "documento-colado.pdf", { type: "application/pdf" }));
    } catch {
      setStatus({ type: "error", message: "Não foi possível acessar o clipboard. Permita o acesso ou selecione o PDF manualmente." });
    }
  }

  useEffect(() => {
    if (acceptedLabel !== "PDF") return;
    const handlePaste = (event: ClipboardEvent) => {
      if (document.activeElement?.matches("input,textarea,select")) return;
      const pastedPdf = Array.from(event.clipboardData?.files || []).find((candidate) => candidate.type === "application/pdf" || candidate.name.toLowerCase().endsWith(".pdf"));
      if (!pastedPdf) return;
      event.preventDefault();
      selectFile(pastedPdf);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [acceptedLabel, selectFile]);

  async function processFile() {
    if (!file) return;
    setStatus({ type: "processing", message: "Processando localmente no navegador…" });
    try {
      if (slug === "pdf-para-word") {
        const pages = await pdfTextRows(file);
        if (!pages.some((rows) => rows.length)) throw new Error("Nenhum texto foi detectado. Este PDF pode ser apenas imagem e precisar de OCR.");
        const zip = docxBlob(pages);
        downloadBlob(new Blob([await zip.arrayBuffer()], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `${baseName(file)}.docx`);
      } else if (slug === "pdf-para-excel") {
        const pages = await pdfTextRows(file);
        if (!pages.some((rows) => rows.length)) throw new Error("Nenhum texto ou tabela foi detectado. Este PDF pode precisar de OCR.");
        const zip = xlsxBlob(pages);
        downloadBlob(new Blob([await zip.arrayBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${baseName(file)}.xlsx`);
      } else if (slug === "word-para-pdf") {
        downloadBytes(await docxToPdf(file), `${baseName(file)}.pdf`);
      } else if (slug === "excel-para-pdf") {
        downloadBytes(await xlsxToPdf(file), `${baseName(file)}.pdf`);
      } else if (slug === "destacar-texto") {
        const result = await highlightPdf(file, highlightQuery);
        downloadBytes(result.bytes, `${baseName(file)}-destacado.pdf`);
        setStatus({ type: "success", message: `${result.matches} ocorrência(s) destacada(s). O download foi iniciado.` });
        return;
      } else if (slug === "marcar-confidencial") {
        downloadBytes(await confidentialPdf(file), `${baseName(file)}-confidencial.pdf`);
      } else if (slug === "proteger-pdf") {
        if (password.length < 4) throw new Error("Use uma senha de abertura com pelo menos 4 caracteres.");
        if (password !== confirmPassword) throw new Error("A confirmação da senha não confere.");
        const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt");
        const encrypted = await encryptPDF(new Uint8Array(await file.arrayBuffer()), password, {
          ownerPassword: ownerPassword || password,
          allowPrinting,
          allowCopying,
          allowModifying,
        });
        downloadBytes(encrypted, `${baseName(file)}-protegido.pdf`);
      } else if (slug === "desbloquear-pdf") {
        if (!password) throw new Error("Informe a senha do PDF.");
        const { decryptPDF } = await import("@pdfsmaller/pdf-decrypt");
        const decrypted = await decryptPDF(new Uint8Array(await file.arrayBuffer()), password);
        downloadBytes(decrypted, `${baseName(file)}-desbloqueado.pdf`);
      } else if (slug === "permissoes-pdf") {
        if (ownerPassword.length < 4) throw new Error("Defina uma senha de proprietário com pelo menos 4 caracteres.");
        const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt");
        const encrypted = await encryptPDF(new Uint8Array(await file.arrayBuffer()), "", {
          ownerPassword,
          allowPrinting,
          allowCopying,
          allowModifying,
        });
        downloadBytes(encrypted, `${baseName(file)}-permissoes.pdf`);
      }
      setStatus({ type: "success", message: "Processamento concluído. O download foi iniciado." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível processar o arquivo." });
    }
  }

  const showPassword = slug === "proteger-pdf" || slug === "desbloquear-pdf";
  const showPermissions = slug === "proteger-pdf" || slug === "permissoes-pdf";
  const fileGuidance = file ? getFileSizeGuidance(file) : null;
  const memoryGuidance = file ? getDeviceMemoryGuidance(file) : "";

  return (
    <section className="workspace" aria-labelledby="advanced-workspace-title" aria-busy={status.type === "processing"}>
      <div className="workspace-heading"><div><h2 id="advanced-workspace-title">Selecione seu arquivo {acceptedLabel}</h2><p>O processamento é feito diretamente no seu navegador.</p></div></div>

      <div
        className={`drop-zone ${dragActive ? "is-dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); if (event.currentTarget === event.target) setDragActive(false); }}
        onDrop={(event) => { event.preventDefault(); setDragActive(false); selectFile(event.dataTransfer.files[0]); }}
      >
        <span className="drop-icon"><UploadCloud size={31} strokeWidth={1.7} /></span>
        <strong>Selecione seu arquivo {acceptedLabel}</strong>
        <span>ou arraste e solte aqui</span>
        <div className="upload-action-row">
          <button type="button" className="primary-button" onClick={() => inputRef.current?.click()}>Selecionar arquivo</button>
          {acceptedLabel === "PDF" ? <button type="button" className="secondary-button paste-file-button" onClick={() => void pastePdfFromClipboard()}>Colar PDF</button> : null}
        </div>
        <small>{acceptedLabel} · até {formatFileSizeLimit()} · processamento local</small>
        <input ref={inputRef} type="file" accept={tool.accept} hidden onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => selectFile(event.target.files?.[0])} />
      </div>

      {file ? (
        <div className="selected-files">
          <div className="selected-files-title"><strong>Arquivo selecionado</strong><button type="button" onClick={() => setFile(null)}>Limpar</button></div>
          <ol><li><span className="file-icon"><FileText size={20} /></span><span className="file-name"><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span></li></ol>
        </div>
      ) : null}

      {fileGuidance && fileGuidance.tier !== "standard" ? <div className="large-file-notice" role="status"><ShieldCheck size={16} /><span><strong>{fileGuidance.tier === "very-large" ? "Arquivo muito grande" : "Arquivo grande"}</strong><small>{fileGuidance.message}</small></span></div> : null}
      {memoryGuidance ? <div className="large-file-notice memory-guidance" role="status"><ShieldCheck size={16} /><span><strong>Modo de capacidade recomendado</strong><small>{memoryGuidance}</small></span></div> : null}

      {file ? (
        <div className="tool-options options-grid">
          {slug === "destacar-texto" ? <label className="option-full"><span>Texto para destacar</span><input value={highlightQuery} onChange={(event) => setHighlightQuery(event.target.value)} placeholder="Ex.: prazo de entrega" /><small>A busca usa a camada de texto existente no PDF.</small></label> : null}

          {showPassword ? <label className="option-full"><span>{slug === "desbloquear-pdf" ? "Senha atual do PDF" : "Senha para abrir o PDF"}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label> : null}
          {slug === "proteger-pdf" ? <label className="option-full"><span>Confirmar senha</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label> : null}
          {(slug === "proteger-pdf" || slug === "permissoes-pdf") ? <label className="option-full"><span>Senha de proprietário</span><input type="password" value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} autoComplete="new-password" placeholder={slug === "proteger-pdf" ? "Opcional; usa a mesma senha se vazio" : "Obrigatória"} /><small>Use esta senha para alterar as permissões posteriormente.</small></label> : null}

          {showPermissions ? <>
            <label><span>Impressão</span><select value={allowPrinting ? "sim" : "nao"} onChange={(event) => setAllowPrinting(event.target.value === "sim")}><option value="sim">Permitir</option><option value="nao">Bloquear</option></select></label>
            <label><span>Copiar conteúdo</span><select value={allowCopying ? "sim" : "nao"} onChange={(event) => setAllowCopying(event.target.value === "sim")}><option value="sim">Permitir</option><option value="nao">Bloquear</option></select></label>
            <label><span>Modificar documento</span><select value={allowModifying ? "sim" : "nao"} onChange={(event) => setAllowModifying(event.target.value === "sim")}><option value="sim">Permitir</option><option value="nao">Bloquear</option></select></label>
          </> : null}

          {(slug === "pdf-para-word" || slug === "pdf-para-excel") ? <div className="option-full privacy-note"><ShieldCheck size={16} /> PDFs digitais preservam melhor o conteúdo. PDFs escaneados precisam de camada de texto/OCR para conversão editável.</div> : null}
          {(slug === "word-para-pdf" || slug === "excel-para-pdf") ? <div className="option-full privacy-note"><ShieldCheck size={16} /> A conversão preserva o conteúdo textual e os dados das células. Recursos avançados do Office podem ser simplificados.</div> : null}
        </div>
      ) : null}

      {status.type !== "idle" ? <div className={`status-message ${status.type}`} role={status.type === "error" ? "alert" : "status"} aria-live={status.type === "error" ? "assertive" : "polite"}>
        {status.type === "processing" ? <LoaderCircle className="spin" size={19} /> : status.type === "success" ? <CheckCircle2 size={19} /> : null}
        <span>{status.message}</span>
      </div> : null}

      <button type="button" className="process-button" disabled={!file || status.type === "processing"} onClick={() => void processFile()}>
        {status.type === "processing" ? <><LoaderCircle className="spin" size={19} /> Processando…</> : <>Processar agora</>}
      </button>
      <p className="privacy-note"><ShieldCheck size={15} /> Seu arquivo não é enviado ao servidor do LIM PDF.</p>
    </section>
  );
}
