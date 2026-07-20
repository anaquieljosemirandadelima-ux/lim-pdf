"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import {
  createStoredZip,
  downloadBlob,
  downloadBytes,
  humanSize,
  outputName,
} from "@/lib/browser-files";
import { parsePageOrder, parsePages } from "@/lib/page-selection";
import { canvasToBlob, extractTextByPage, renderPdfPages } from "@/lib/pdf-render";
import type { ToolDefinition, ToolSlug } from "@/lib/tools";
import { useTemporaryFiles } from "@/lib/use-temporary-files";

const MAX_FILE_SIZE = 60 * 1024 * 1024;
const MM_TO_POINTS = 72 / 25.4;
const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  A5: { width: 419.53, height: 595.28 },
  Carta: { width: 612, height: 792 },
  Oficio: { width: 612, height: 1008 },
} as const;

type PdfLibModule = typeof import("pdf-lib");
let pdfLibPromise: Promise<PdfLibModule> | null = null;

async function getPdfLib() {
  if (!pdfLibPromise) pdfLibPromise = import("pdf-lib");
  return pdfLibPromise;
}

type Status =
  | { type: "idle" }
  | { type: "processing"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

type FormFieldDescriptor = {
  name: string;
  label: string;
  kind: "text" | "checkbox" | "select" | "unsupported";
  options?: string[];
  value: string | boolean;
};

interface PdfToolWorkspaceProps {
  tool: ToolDefinition;
}

function getPosition(
  pageWidth: number,
  pageHeight: number,
  itemWidth: number,
  itemHeight: number,
  position: Position,
  margin = 28,
) {
  const left = margin;
  const centerX = (pageWidth - itemWidth) / 2;
  const right = pageWidth - itemWidth - margin;
  const top = pageHeight - itemHeight - margin;
  const centerY = (pageHeight - itemHeight) / 2;
  const bottom = margin;
  const positions: Record<Position, { x: number; y: number }> = {
    "top-left": { x: left, y: top },
    "top-center": { x: centerX, y: top },
    "top-right": { x: right, y: top },
    center: { x: centerX, y: centerY },
    "bottom-left": { x: left, y: bottom },
    "bottom-center": { x: centerX, y: bottom },
    "bottom-right": { x: right, y: bottom },
  };
  return positions[position];
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(normalized)) throw new Error("Escolha uma cor válida.");
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16) / 255,
    green: Number.parseInt(normalized.slice(2, 4), 16) / 255,
    blue: Number.parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

export function PdfToolWorkspace({ tool }: PdfToolWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [overlayImage, setOverlayImage] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [pageSpecification, setPageSpecification] = useState("1");
  const [pageOrder, setPageOrder] = useState("1");
  const [rotation, setRotation] = useState("90");
  const [startNumber, setStartNumber] = useState("1");
  const [position, setPosition] = useState<Position>("bottom-center");
  const [fontSize, setFontSize] = useState("12");
  const [watermark, setWatermark] = useState("CONFIDENCIAL");
  const [customText, setCustomText] = useState("Documento revisado");
  const [copyCount, setCopyCount] = useState("1");
  const [blankPosition, setBlankPosition] = useState("1");
  const [cropMillimeters, setCropMillimeters] = useState("5");
  const [pageFormat, setPageFormat] = useState<keyof typeof PAGE_SIZES>("A4");
  const [pagesPerSheet, setPagesPerSheet] = useState("2");
  const [imageScale, setImageScale] = useState("25");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [renderResolution, setRenderResolution] = useState("1.5");
  const [compression, setCompression] = useState("equilibrada");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("LIM PDF");
  const [alignment, setAlignment] = useState<"left" | "center" | "right">("center");
  const [mirrorDirection, setMirrorDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [backgroundColor, setBackgroundColor] = useState("#f4f7fb");
  const [formFields, setFormFields] = useState<FormFieldDescriptor[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const { restored, cached, clearCache } = useTemporaryFiles(`tool:${tool.slug}`, files, setFiles);

  const acceptsImages = tool.slug === "imagens-para-pdf";
  const canProcess = files.length > 0 && status.type !== "processing" && !loadingFields;
  const acceptedLabel = useMemo(() => (acceptsImages ? "JPG ou PNG" : "PDF"), [acceptsImages]);

  useEffect(() => {
    if (tool.slug !== "preencher-formulario-pdf" || !files[0]) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoadingFields(true);
      try {
        const pdfLib = await getPdfLib();
        const document = await pdfLib.PDFDocument.load(await files[0].arrayBuffer());
        const fields = document.getForm().getFields().map<FormFieldDescriptor>((field) => {
          const name = field.getName();
          if (field instanceof pdfLib.PDFTextField) {
            return { name, label: name, kind: "text", value: field.getText() || "" };
          }
          if (field instanceof pdfLib.PDFCheckBox) {
            return { name, label: name, kind: "checkbox", value: field.isChecked() };
          }
          if (field instanceof pdfLib.PDFDropdown) {
            return { name, label: name, kind: "select", options: field.getOptions(), value: field.getSelected()[0] || "" };
          }
          if (field instanceof pdfLib.PDFRadioGroup) {
            return { name, label: name, kind: "select", options: field.getOptions(), value: field.getSelected() || "" };
          }
          if (field instanceof pdfLib.PDFOptionList) {
            return { name, label: name, kind: "select", options: field.getOptions(), value: field.getSelected()[0] || "" };
          }
          return { name, label: name, kind: "unsupported", value: "" };
        });
        if (!cancelled) setFormFields(fields);
      } catch {
        if (!cancelled) setStatus({ type: "error", message: "Não foi possível ler os campos deste formulário." });
      } finally {
        if (!cancelled) setLoadingFields(false);
      }
    })();
    return () => { cancelled = true; };
  }, [files, tool.slug]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const next = Array.from(incoming);
    const invalidType = next.find((file) => acceptsImages
      ? !["image/jpeg", "image/png"].includes(file.type)
      : file.type !== "application/pdf");
    if (invalidType) {
      setStatus({ type: "error", message: `O arquivo ${invalidType.name} não é compatível.` });
      return;
    }
    const oversized = next.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setStatus({ type: "error", message: `${oversized.name} ultrapassa o limite recomendado de 60 MB.` });
      return;
    }
    setFiles((current) => (tool.multiple ? [...current, ...next] : next.slice(0, 1)));
    setStatus({ type: "idle" });
  }, [acceptsImages, tool.multiple]);

  function removeFile(index: number) {
    setFiles((current) => {
      const next = current.filter((_, fileIndex) => fileIndex !== index);
      if (!next.length) clearCache();
      return next;
    });
    setStatus({ type: "idle" });
  }

  function moveFile(index: number, direction: -1 | 1) {
    setFiles((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function loadPrimary() {
    const file = files[0];
    if (!file) throw new Error("Selecione um arquivo PDF.");
    try {
      const pdfLib = await getPdfLib();
      return { pdfLib, file, document: await pdfLib.PDFDocument.load(await file.arrayBuffer()) };
    } catch {
      throw new Error("Não foi possível abrir o PDF. Verifique se ele não está protegido por senha ou corrompido.");
    }
  }

  async function processMerge() {
    if (files.length < 2) throw new Error("Selecione pelo menos dois arquivos PDF.");
    const pdfLib = await getPdfLib();
    const output = await pdfLib.PDFDocument.create();
    for (const file of files) {
      const source = await pdfLib.PDFDocument.load(await file.arrayBuffer());
      const copiedPages = await output.copyPages(source, source.getPageIndices());
      copiedPages.forEach((page) => output.addPage(page));
    }
    downloadBytes(await output.save({ useObjectStreams: true }), "documentos-unidos-lim-pdf.pdf");
  }

  async function processSplit() {
    const { pdfLib, file, document } = await loadPrimary();
    const entries = [];
    for (const index of document.getPageIndices()) {
      const output = await pdfLib.PDFDocument.create();
      const [page] = await output.copyPages(document, [index]);
      output.addPage(page);
      entries.push({ name: `${file.name.replace(/\.pdf$/i, "")}-pagina-${index + 1}.pdf`, data: await output.save({ useObjectStreams: true }) });
    }
    downloadBlob(createStoredZip(entries), `${file.name.replace(/\.pdf$/i, "")}-paginas.zip`);
  }

  async function processExtract(removeSelected: boolean) {
    const { pdfLib, file, document } = await loadPrimary();
    const selected = parsePages(pageSpecification, document.getPageCount());
    const selectedSet = new Set(selected);
    const indices = removeSelected ? document.getPageIndices().filter((page) => !selectedSet.has(page)) : selected;
    if (!indices.length) throw new Error("A operação não pode gerar um PDF sem páginas.");
    const output = await pdfLib.PDFDocument.create();
    const copied = await output.copyPages(document, indices);
    copied.forEach((page) => output.addPage(page));
    downloadBytes(await output.save({ useObjectStreams: true }), outputName(file, removeSelected ? "paginas-removidas" : "paginas-extraidas"));
  }

  async function processOrganize() {
    const { pdfLib, file, document } = await loadPrimary();
    const indices = parsePageOrder(pageOrder, document.getPageCount());
    const output = await pdfLib.PDFDocument.create();
    const copied = await output.copyPages(document, indices);
    copied.forEach((page) => output.addPage(page));
    downloadBytes(await output.save({ useObjectStreams: true }), outputName(file, "organizado"));
  }

  async function processRotate() {
    const { pdfLib, file, document } = await loadPrimary();
    const amount = Number(rotation);
    for (const index of parsePages(pageSpecification, document.getPageCount(), true)) {
      const page = document.getPage(index);
      page.setRotation(pdfLib.degrees((page.getRotation().angle + amount) % 360));
    }
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "girado"));
  }

  async function processDuplicate() {
    const { pdfLib, file, document } = await loadPrimary();
    const selectedPages = new Set(parsePages(pageSpecification, document.getPageCount()));
    const copies = Number(copyCount);
    if (!Number.isInteger(copies) || copies < 1 || copies > 20) throw new Error("Escolha entre 1 e 20 cópias.");
    const output = await pdfLib.PDFDocument.create();
    for (const index of document.getPageIndices()) {
      const repetitions = selectedPages.has(index) ? copies + 1 : 1;
      const pages = await output.copyPages(document, Array.from({ length: repetitions }, () => index));
      pages.forEach((page) => output.addPage(page));
    }
    downloadBytes(await output.save({ useObjectStreams: true }), outputName(file, "paginas-duplicadas"));
  }

  async function processBlankPage() {
    const { file, document } = await loadPrimary();
    const positionNumber = Number(blankPosition);
    if (!Number.isInteger(positionNumber) || positionNumber < 1 || positionNumber > document.getPageCount() + 1) {
      throw new Error(`Escolha uma posição entre 1 e ${document.getPageCount() + 1}.`);
    }
    document.insertPage(positionNumber - 1, [PAGE_SIZES.A4.width, PAGE_SIZES.A4.height]);
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "pagina-em-branco"));
  }

  async function processAlternate() {
    if (files.length !== 2) throw new Error("Selecione exatamente dois PDFs, na ordem desejada.");
    const pdfLib = await getPdfLib();
    const documents = await Promise.all(files.map(async (file) => pdfLib.PDFDocument.load(await file.arrayBuffer())));
    const output = await pdfLib.PDFDocument.create();
    const maximum = Math.max(documents[0].getPageCount(), documents[1].getPageCount());
    for (let index = 0; index < maximum; index += 1) {
      for (const document of documents) {
        if (index < document.getPageCount()) {
          const [page] = await output.copyPages(document, [index]);
          output.addPage(page);
        }
      }
    }
    downloadBytes(await output.save({ useObjectStreams: true }), "pdfs-alternados-lim-pdf.pdf");
  }

  async function processOverlay() {
    if (files.length !== 2) throw new Error("Selecione dois PDFs: primeiro a base e depois a camada superior.");
    const pdfLib = await getPdfLib();
    const base = await pdfLib.PDFDocument.load(await files[0].arrayBuffer());
    const overlay = await pdfLib.PDFDocument.load(await files[1].arrayBuffer());
    const overlayPages = overlay.getPages();
    if (!overlayPages.length) throw new Error("O PDF de sobreposição não possui páginas.");
    for (let index = 0; index < base.getPageCount(); index += 1) {
      const page = base.getPage(index);
      const overlayIndex = overlayPages.length === 1 ? 0 : Math.min(index, overlayPages.length - 1);
      const embedded = await base.embedPage(overlayPages[overlayIndex]);
      page.drawPage(embedded, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }
    downloadBytes(await base.save({ useObjectStreams: true }), outputName(files[0], "sobreposto"));
  }

  async function processNumbering() {
    const { pdfLib, file, document } = await loadPrimary();
    const font = await document.embedFont(pdfLib.StandardFonts.Helvetica);
    const initial = Number(startNumber);
    const size = Number(fontSize);
    if (!Number.isInteger(initial) || initial < 0) throw new Error("Informe um número inicial válido.");
    if (!Number.isFinite(size) || size < 6 || size > 72) throw new Error("Escolha um tamanho entre 6 e 72.");
    document.getPages().forEach((page, index) => {
      const label = String(initial + index);
      const width = font.widthOfTextAtSize(label, size);
      page.drawText(label, { ...getPosition(page.getWidth(), page.getHeight(), width, size, position), size, font, color: pdfLib.rgb(0.25, 0.29, 0.36) });
    });
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "numerado"));
  }

  async function processWatermark() {
    const text = watermark.trim();
    if (!text) throw new Error("Digite o texto da marca-d’água.");
    const { pdfLib, file, document } = await loadPrimary();
    const font = await document.embedFont(pdfLib.StandardFonts.HelveticaBold);
    const selectedPages = new Set(parsePages(pageSpecification, document.getPageCount(), true));
    document.getPages().forEach((page, index) => {
      if (!selectedPages.has(index)) return;
      const size = Math.max(24, Math.min(58, page.getWidth() / Math.max(7, text.length / 4)));
      const width = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: (page.getWidth() - width * 0.82) / 2, y: page.getHeight() / 2, size, font, rotate: pdfLib.degrees(35), opacity: 0.18, color: pdfLib.rgb(0.15, 0.3, 0.75) });
    });
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "marca-dagua"));
  }

  async function processText() {
    const text = customText.trim();
    if (!text) throw new Error("Digite o texto que será adicionado.");
    const { pdfLib, file, document } = await loadPrimary();
    const font = await document.embedFont(pdfLib.StandardFonts.Helvetica);
    const size = Number(fontSize);
    if (!Number.isFinite(size) || size < 6 || size > 72) throw new Error("Escolha um tamanho entre 6 e 72.");
    const selectedPages = new Set(parsePages(pageSpecification, document.getPageCount(), true));
    document.getPages().forEach((page, index) => {
      if (!selectedPages.has(index)) return;
      const width = font.widthOfTextAtSize(text, size);
      page.drawText(text, { ...getPosition(page.getWidth(), page.getHeight(), width, size, position), size, font, color: pdfLib.rgb(0.08, 0.11, 0.17) });
    });
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "com-texto"));
  }

  async function processImage() {
    if (!overlayImage) throw new Error("Selecione a imagem JPG ou PNG que será aplicada.");
    const { file, document } = await loadPrimary();
    const bytes = await overlayImage.arrayBuffer();
    const image = overlayImage.type === "image/png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
    const scalePercent = Number(imageScale);
    if (!Number.isFinite(scalePercent) || scalePercent < 5 || scalePercent > 80) throw new Error("Escolha um tamanho entre 5% e 80%.");
    const selectedPages = new Set(parsePages(pageSpecification, document.getPageCount(), true));
    document.getPages().forEach((page, index) => {
      if (!selectedPages.has(index)) return;
      const width = page.getWidth() * (scalePercent / 100);
      const height = width * (image.height / image.width);
      page.drawImage(image, { ...getPosition(page.getWidth(), page.getHeight(), width, height, position), width, height });
    });
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "com-imagem"));
  }

  async function processSignature() {
    if (!signatureDataUrl) throw new Error("Desenhe sua assinatura antes de continuar.");
    const { file, document } = await loadPrimary();
    const image = await document.embedPng(dataUrlToBytes(signatureDataUrl));
    const page = document.getPage(document.getPageCount() - 1);
    const width = page.getWidth() * 0.28;
    const height = width * (image.height / image.width);
    page.drawImage(image, { ...getPosition(page.getWidth(), page.getHeight(), width, height, position), width, height });
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "assinado"));
  }

  async function processMetadata() {
    const { file, document } = await loadPrimary();
    document.setTitle(""); document.setAuthor(""); document.setSubject(""); document.setKeywords([]); document.setCreator(""); document.setProducer("");
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "sem-metadados"));
  }

  async function processCrop() {
    const { file, document } = await loadPrimary();
    const margin = Number(cropMillimeters) * MM_TO_POINTS;
    if (!Number.isFinite(margin) || margin < 0) throw new Error("Informe uma margem válida.");
    for (const page of document.getPages()) {
      const width = page.getWidth() - margin * 2;
      const height = page.getHeight() - margin * 2;
      if (width < 72 || height < 72) throw new Error("O recorte é maior que o tamanho de uma das páginas.");
      page.setCropBox(margin, margin, width, height);
    }
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "recortado"));
  }

  async function processResize() {
    const { pdfLib, file, document } = await loadPrimary();
    const target = PAGE_SIZES[pageFormat];
    const output = await pdfLib.PDFDocument.create();
    for (const sourcePage of document.getPages()) {
      const embedded = await output.embedPage(sourcePage);
      const page = output.addPage([target.width, target.height]);
      const scale = Math.min((target.width - 36) / sourcePage.getWidth(), (target.height - 36) / sourcePage.getHeight());
      const width = sourcePage.getWidth() * scale;
      const height = sourcePage.getHeight() * scale;
      page.drawPage(embedded, { x: (target.width - width) / 2, y: (target.height - height) / 2, width, height });
    }
    downloadBytes(await output.save({ useObjectStreams: true }), outputName(file, `formato-${pageFormat.toLowerCase()}`));
  }

  async function processNUp() {
    const { pdfLib, file, document } = await loadPrimary();
    const numberPerSheet = Number(pagesPerSheet);
    const output = await pdfLib.PDFDocument.create();
    const target = PAGE_SIZES.A4;
    const columns = numberPerSheet === 2 ? 1 : 2;
    const rows = 2;
    const gap = 10;
    const cellWidth = (target.width - gap * (columns + 1)) / columns;
    const cellHeight = (target.height - gap * (rows + 1)) / rows;
    const sourcePages = document.getPages();
    for (let start = 0; start < sourcePages.length; start += numberPerSheet) {
      const outputPage = output.addPage([target.width, target.height]);
      const group = sourcePages.slice(start, start + numberPerSheet);
      for (let index = 0; index < group.length; index += 1) {
        const sourcePage = group[index];
        const embedded = await output.embedPage(sourcePage);
        const column = index % columns;
        const row = Math.floor(index / columns);
        const scale = Math.min(cellWidth / sourcePage.getWidth(), cellHeight / sourcePage.getHeight());
        const width = sourcePage.getWidth() * scale;
        const height = sourcePage.getHeight() * scale;
        const x = gap + column * (cellWidth + gap) + (cellWidth - width) / 2;
        const y = target.height - gap - (row + 1) * cellHeight - row * gap + (cellHeight - height) / 2;
        outputPage.drawPage(embedded, { x, y, width, height });
      }
    }
    downloadBytes(await output.save({ useObjectStreams: true }), outputName(file, `${numberPerSheet}-paginas-por-folha`));
  }

  async function processImages() {
    const pdfLib = await getPdfLib();
    const output = await pdfLib.PDFDocument.create();
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const image = file.type === "image/png" ? await output.embedPng(bytes) : await output.embedJpg(bytes);
      const page = output.addPage([PAGE_SIZES.A4.width, PAGE_SIZES.A4.height]);
      const scale = Math.min((page.getWidth() - 56) / image.width, (page.getHeight() - 56) / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      page.drawImage(image, { x: (page.getWidth() - width) / 2, y: (page.getHeight() - height) / 2, width, height });
    }
    downloadBytes(await output.save({ useObjectStreams: true }), "imagens-convertidas-lim-pdf.pdf");
  }

  async function processPdfToImage(type: "image/jpeg" | "image/png") {
    const file = files[0];
    if (!file) throw new Error("Selecione um PDF.");
    const scale = Number(renderResolution);
    const pages = await renderPdfPages(await file.arrayBuffer(), scale);
    const extension = type === "image/jpeg" ? "jpg" : "png";
    const entries = [];
    for (const page of pages) {
      const blob = await canvasToBlob(page.canvas, type, 0.9);
      entries.push({ name: `${file.name.replace(/\.pdf$/i, "")}-pagina-${page.pageNumber}.${extension}`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    downloadBlob(createStoredZip(entries), `${file.name.replace(/\.pdf$/i, "")}-${extension}.zip`);
  }

  async function processRasterPdf(grayscale: boolean) {
    const file = files[0];
    if (!file) throw new Error("Selecione um PDF.");
    const pdfLib = await getPdfLib();
    const presets = {
      leve: { scale: 1.65, quality: 0.84 },
      equilibrada: { scale: 1.35, quality: 0.7 },
      forte: { scale: 1.05, quality: 0.5 },
    } as const;
    const preset = presets[compression as keyof typeof presets] || presets.equilibrada;
    const pages = await renderPdfPages(await file.arrayBuffer(), preset.scale, grayscale);
    const output = await pdfLib.PDFDocument.create();
    for (const rendered of pages) {
      const blob = await canvasToBlob(rendered.canvas, "image/jpeg", grayscale ? 0.82 : preset.quality);
      const image = await output.embedJpg(await blob.arrayBuffer());
      const width = rendered.width / preset.scale;
      const height = rendered.height / preset.scale;
      const page = output.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
    }
    downloadBytes(await output.save({ useObjectStreams: true }), outputName(file, grayscale ? "escala-de-cinza" : "compactado"));
  }

  async function processExtractText() {
    const file = files[0];
    if (!file) throw new Error("Selecione um PDF.");
    const pages = await extractTextByPage(await file.arrayBuffer());
    const text = pages.map((page, index) => `--- Página ${index + 1} ---\n${page || "[Nenhum texto detectado]"}`).join("\n\n");
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${file.name.replace(/\.pdf$/i, "")}-texto.txt`);
  }

  async function processFillForm() {
    const { pdfLib, file, document } = await loadPrimary();
    const form = document.getForm();
    if (!form.getFields().length) throw new Error("Este PDF não possui campos interativos compatíveis.");
    for (const descriptor of formFields) {
      if (descriptor.kind === "unsupported") continue;
      const field = form.getField(descriptor.name);
      if (field instanceof pdfLib.PDFTextField) field.setText(String(descriptor.value));
      else if (field instanceof pdfLib.PDFCheckBox) { if (descriptor.value) field.check(); else field.uncheck(); }
      else if (field instanceof pdfLib.PDFDropdown && descriptor.value) field.select(String(descriptor.value));
      else if (field instanceof pdfLib.PDFRadioGroup && descriptor.value) field.select(String(descriptor.value));
      else if (field instanceof pdfLib.PDFOptionList && descriptor.value) field.select(String(descriptor.value));
    }
    const font = await document.embedFont(pdfLib.StandardFonts.Helvetica);
    form.updateFieldAppearances(font);
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "formulario-preenchido"));
  }

  async function processFlattenForm() {
    const { file, document } = await loadPrimary();
    const form = document.getForm();
    if (!form.getFields().length) throw new Error("Este PDF não possui campos de formulário para achatar.");
    form.flatten({ updateFieldAppearances: true });
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "formulario-achatado"));
  }

  async function processHeaderFooter() {
    if (!headerText.trim() && !footerText.trim()) throw new Error("Digite um cabeçalho ou rodapé.");
    const { pdfLib, file, document } = await loadPrimary();
    const font = await document.embedFont(pdfLib.StandardFonts.Helvetica);
    const size = Number(fontSize);
    const xFor = (pageWidth: number, textWidth: number) => alignment === "left" ? 28 : alignment === "right" ? pageWidth - textWidth - 28 : (pageWidth - textWidth) / 2;
    for (const page of document.getPages()) {
      if (headerText.trim()) {
        const width = font.widthOfTextAtSize(headerText.trim(), size);
        page.drawText(headerText.trim(), { x: xFor(page.getWidth(), width), y: page.getHeight() - size - 22, size, font, color: pdfLib.rgb(0.22, 0.26, 0.34) });
      }
      if (footerText.trim()) {
        const width = font.widthOfTextAtSize(footerText.trim(), size);
        page.drawText(footerText.trim(), { x: xFor(page.getWidth(), width), y: 22, size, font, color: pdfLib.rgb(0.22, 0.26, 0.34) });
      }
    }
    downloadBytes(await document.save({ useObjectStreams: true }), outputName(file, "cabecalho-rodape"));
  }

  async function processMirror() {
    const { pdfLib, file, document } = await loadPrimary();
    const output = await pdfLib.PDFDocument.create();
    for (const sourcePage of document.getPages()) {
      const width = sourcePage.getWidth();
      const height = sourcePage.getHeight();
      const embedded = await output.embedPage(sourcePage);
      const page = output.addPage([width, height]);
      page.drawPage(embedded, mirrorDirection === "horizontal"
        ? { x: width, y: 0, xScale: -1, yScale: 1 }
        : { x: 0, y: height, xScale: 1, yScale: -1 });
    }
    downloadBytes(await output.save({ useObjectStreams: true }), outputName(file, `espelhado-${mirrorDirection}`));
  }

  async function processBackground() {
    const { pdfLib, file, document } = await loadPrimary();
    const color = hexToRgb(backgroundColor);
    const output = await pdfLib.PDFDocument.create();
    for (const sourcePage of document.getPages()) {
      const width = sourcePage.getWidth();
      const height = sourcePage.getHeight();
      const embedded = await output.embedPage(sourcePage);
      const page = output.addPage([width, height]);
      page.drawRectangle({ x: 0, y: 0, width, height, color: pdfLib.rgb(color.red, color.green, color.blue) });
      page.drawPage(embedded, { x: 0, y: 0, width, height });
    }
    downloadBytes(await output.save({ useObjectStreams: true }), outputName(file, "com-fundo"));
  }

  async function processFiles() {
    if (!files.length) return;
    setStatus({ type: "processing", message: "Processando no seu navegador. Não feche esta página." });
    try {
      const operations: Record<Exclude<ToolSlug, "editar-pdf">, () => Promise<void>> = {
        "juntar-pdf": processMerge,
        "dividir-pdf": processSplit,
        "extrair-paginas": () => processExtract(false),
        "excluir-paginas": () => processExtract(true),
        "organizar-paginas": processOrganize,
        "girar-pdf": processRotate,
        "duplicar-paginas": processDuplicate,
        "inserir-pagina-em-branco": processBlankPage,
        "alternar-pdfs": processAlternate,
        "sobrepor-pdfs": processOverlay,
        "numerar-paginas": processNumbering,
        "marca-dagua-pdf": processWatermark,
        "adicionar-texto-pdf": processText,
        "adicionar-imagem-pdf": processImage,
        "assinar-pdf": processSignature,
        "remover-metadados": processMetadata,
        "recortar-pdf": processCrop,
        "redimensionar-pdf": processResize,
        "paginas-por-folha": processNUp,
        "imagens-para-pdf": processImages,
        "pdf-para-jpg": () => processPdfToImage("image/jpeg"),
        "pdf-para-png": () => processPdfToImage("image/png"),
        "compactar-pdf": () => processRasterPdf(false),
        "pdf-em-escala-de-cinza": () => processRasterPdf(true),
        "extrair-texto-pdf": processExtractText,
        "preencher-formulario-pdf": processFillForm,
        "achatar-formulario-pdf": processFlattenForm,
        "cabecalho-rodape-pdf": processHeaderFooter,
        "espelhar-pdf": processMirror,
        "adicionar-fundo-pdf": processBackground,
      };
      await operations[tool.slug as Exclude<ToolSlug, "editar-pdf">]();
      setStatus({ type: "success", message: "Arquivo criado com sucesso. O download foi iniciado." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível processar o arquivo." });
    }
  }

  const usesPageSelection = [
    "extrair-paginas", "excluir-paginas", "girar-pdf", "duplicar-paginas", "marca-dagua-pdf", "adicionar-texto-pdf", "adicionar-imagem-pdf",
  ].includes(tool.slug);

  return (
    <section className="workspace" aria-labelledby="workspace-title">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Ferramenta gratuita e funcional</span>
          <h2 id="workspace-title">Selecione seu arquivo</h2>
        </div>
        <span className="local-badge"><ShieldCheck size={17} /> Processamento local</span>
      </div>

      <div
        className={`drop-zone ${dragActive ? "is-dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); if (event.currentTarget === event.target) setDragActive(false); }}
        onDrop={(event) => { event.preventDefault(); setDragActive(false); addFiles(event.dataTransfer.files); }}
      >
        <span className="drop-icon"><UploadCloud size={31} strokeWidth={1.7} aria-hidden="true" /></span>
        <strong>Arraste {tool.multiple ? "seus arquivos" : "seu arquivo"} aqui</strong>
        <span>ou escolha no seu dispositivo</span>
        <button type="button" className="primary-button" onClick={() => inputRef.current?.click()}>
          Selecionar {tool.multiple ? "arquivos" : "arquivo"}
        </button>
        <small>{acceptedLabel} · máximo recomendado de 60 MB por arquivo</small>
        <input ref={inputRef} type="file" accept={tool.accept} multiple={tool.multiple} onChange={(event) => event.target.files && addFiles(event.target.files)} hidden />
      </div>

      {files.length ? (
        <div className="selected-files">
          <div className="selected-files-title"><strong>{files.length} arquivo(s) selecionado(s)</strong><button type="button" onClick={() => setFiles([])}>Limpar</button></div>
          <ol>
            {files.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`}>
                <span className="file-icon">{acceptsImages ? <FileImage size={20} /> : <FileText size={20} />}</span>
                <span className="file-name"><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span>
                {tool.multiple ? <span className="file-order"><button type="button" onClick={() => moveFile(index, -1)} disabled={index === 0} aria-label={`Mover ${file.name} para cima`}><ArrowUp size={17} /></button><button type="button" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1} aria-label={`Mover ${file.name} para baixo`}><ArrowDown size={17} /></button></span> : null}
                <button type="button" className="remove-file" onClick={() => removeFile(index)} aria-label={`Remover ${file.name}`}><Trash2 size={18} /></button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {files.length ? (
        <div className="tool-options options-grid">
          {usesPageSelection && <label><span>Páginas {tool.slug === "extrair-paginas" || tool.slug === "excluir-paginas" || tool.slug === "duplicar-paginas" ? "" : "(vazio = todas)"}</span><input value={pageSpecification} onChange={(event) => setPageSpecification(event.target.value)} placeholder="Ex.: 1,3-5,8" /><small>Use vírgulas e intervalos, como 1,3-5.</small></label>}
          {tool.slug === "organizar-paginas" && <label className="option-full"><span>Nova ordem das páginas</span><input value={pageOrder} onChange={(event) => setPageOrder(event.target.value)} placeholder="Ex.: 3,1,2,4-6 ou 6-1" /><small>É possível repetir páginas e usar intervalos em ordem inversa.</small></label>}
          {tool.slug === "girar-pdf" && <label><span>Rotação</span><select value={rotation} onChange={(event) => setRotation(event.target.value)}><option value="90">90° para a direita</option><option value="180">180°</option><option value="270">90° para a esquerda</option></select></label>}
          {tool.slug === "duplicar-paginas" && <label><span>Cópias adicionais</span><input type="number" min="1" max="20" value={copyCount} onChange={(event) => setCopyCount(event.target.value)} /></label>}
          {tool.slug === "inserir-pagina-em-branco" && <label><span>Posição da nova página</span><input type="number" min="1" value={blankPosition} onChange={(event) => setBlankPosition(event.target.value)} /><small>1 coloca no início. O último número coloca no final.</small></label>}
          {tool.slug === "numerar-paginas" && <><label><span>Começar pelo número</span><input type="number" min="0" value={startNumber} onChange={(event) => setStartNumber(event.target.value)} /></label><PositionSelect value={position} onChange={setPosition} /><FontSize value={fontSize} onChange={setFontSize} /></>}
          {tool.slug === "marca-dagua-pdf" && <label className="option-full"><span>Texto da marca-d’água</span><input maxLength={70} value={watermark} onChange={(event) => setWatermark(event.target.value)} /></label>}
          {tool.slug === "adicionar-texto-pdf" && <><label className="option-full"><span>Texto</span><input maxLength={160} value={customText} onChange={(event) => setCustomText(event.target.value)} /></label><PositionSelect value={position} onChange={setPosition} /><FontSize value={fontSize} onChange={setFontSize} /></>}
          {tool.slug === "adicionar-imagem-pdf" && <><label className="option-full"><span>Imagem JPG ou PNG</span><button type="button" className="secondary-button option-upload" onClick={() => imageInputRef.current?.click()}>{overlayImage ? overlayImage.name : "Selecionar imagem"}</button><input ref={imageInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={(event) => setOverlayImage(event.target.files?.[0] || null)} /></label><PositionSelect value={position} onChange={setPosition} /><label><span>Largura relativa</span><input type="number" min="5" max="80" value={imageScale} onChange={(event) => setImageScale(event.target.value)} /><small>Percentual da largura da página.</small></label></>}
          {tool.slug === "assinar-pdf" && <><div className="option-full"><SignaturePad onChange={setSignatureDataUrl} /></div><PositionSelect value={position} onChange={setPosition} /></>}
          {tool.slug === "recortar-pdf" && <label><span>Recortar em cada lado</span><input type="number" min="0" step="0.5" value={cropMillimeters} onChange={(event) => setCropMillimeters(event.target.value)} /><small>Medida em milímetros.</small></label>}
          {tool.slug === "redimensionar-pdf" && <label><span>Novo formato</span><select value={pageFormat} onChange={(event) => setPageFormat(event.target.value as keyof typeof PAGE_SIZES)}>{Object.keys(PAGE_SIZES).map((format) => <option key={format} value={format}>{format}</option>)}</select></label>}
          {tool.slug === "paginas-por-folha" && <label><span>Páginas em cada folha A4</span><select value={pagesPerSheet} onChange={(event) => setPagesPerSheet(event.target.value)}><option value="2">2 páginas</option><option value="4">4 páginas</option></select></label>}
          {(tool.slug === "pdf-para-jpg" || tool.slug === "pdf-para-png") && <label><span>Resolução</span><select value={renderResolution} onChange={(event) => setRenderResolution(event.target.value)}><option value="1">Normal</option><option value="1.5">Alta</option><option value="2">Muito alta</option></select><small>Resoluções maiores usam mais memória.</small></label>}
          {(tool.slug === "compactar-pdf" || tool.slug === "pdf-em-escala-de-cinza") && <label><span>{tool.slug === "compactar-pdf" ? "Nível de compactação" : "Qualidade de saída"}</span><select value={compression} onChange={(event) => setCompression(event.target.value)}><option value="leve">Alta qualidade</option><option value="equilibrada">Equilibrada</option><option value="forte">Arquivo menor</option></select></label>}
          {tool.slug === "preencher-formulario-pdf" && <FormFieldsEditor loading={loadingFields} fields={formFields} onChange={setFormFields} />}
          {tool.slug === "cabecalho-rodape-pdf" && <><label className="option-full"><span>Cabeçalho</span><input maxLength={100} value={headerText} onChange={(event) => setHeaderText(event.target.value)} placeholder="Ex.: Nome da empresa" /></label><label className="option-full"><span>Rodapé</span><input maxLength={100} value={footerText} onChange={(event) => setFooterText(event.target.value)} placeholder="Ex.: Documento confidencial" /></label><label><span>Alinhamento</span><select value={alignment} onChange={(event) => setAlignment(event.target.value as typeof alignment)}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label><FontSize value={fontSize} onChange={setFontSize} /></>}
          {tool.slug === "espelhar-pdf" && <label><span>Direção</span><select value={mirrorDirection} onChange={(event) => setMirrorDirection(event.target.value as typeof mirrorDirection)}><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label>}
          {tool.slug === "adicionar-fundo-pdf" && <label><span>Cor do fundo</span><input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} /></label>}
        </div>
      ) : null}

      {status.type !== "idle" ? <div className={`status-message status-${status.type}`} role="status">{status.type === "processing" ? <LoaderCircle className="spin" size={19} /> : null}{status.type === "success" ? <CheckCircle2 size={19} /> : null}{status.type === "error" ? <AlertCircle size={19} /> : null}<span>{status.message}</span></div> : null}

      {files.length ? <button type="button" className="process-button" onClick={processFiles} disabled={!canProcess}>{status.type === "processing" ? <LoaderCircle className="spin" size={20} /> : <Download size={20} />}{status.type === "processing" ? "Processando..." : `${tool.name} agora`}</button> : null}

      <p className="privacy-note"><ShieldCheck size={15} /> Seus arquivos não são enviados ao LIM PDF. {cached ? "Uma cópia temporária está protegida no cache deste navegador por até 4 horas." : "O processamento acontece somente na memória do navegador."}{restored ? " Esta sessão foi recuperada automaticamente." : ""}</p>
    </section>
  );
}

function FormFieldsEditor({ loading, fields, onChange }: { loading: boolean; fields: FormFieldDescriptor[]; onChange: (fields: FormFieldDescriptor[]) => void }) {
  if (loading) return <div className="option-full form-fields-state"><LoaderCircle className="spin" size={18} /> Lendo os campos do formulário...</div>;
  if (!fields.length) return <div className="option-full form-fields-state">Nenhum campo interativo compatível foi encontrado neste PDF.</div>;
  function update(index: number, value: string | boolean) {
    onChange(fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, value } : field));
  }
  return <div className="option-full dynamic-form-fields"><strong>{fields.length} campo(s) detectado(s)</strong>{fields.map((field, index) => {
    if (field.kind === "checkbox") return <label className="checkbox-option" key={field.name}><input type="checkbox" checked={Boolean(field.value)} onChange={(event) => update(index, event.target.checked)} /><span>{field.label}</span></label>;
    if (field.kind === "select") return <label key={field.name}><span>{field.label}</span><select value={String(field.value)} onChange={(event) => update(index, event.target.value)}><option value="">Selecione</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
    if (field.kind === "unsupported") return <div className="unsupported-field" key={field.name}>{field.label}: tipo de campo não suportado nesta versão.</div>;
    return <label key={field.name}><span>{field.label}</span><input value={String(field.value)} onChange={(event) => update(index, event.target.value)} /></label>;
  })}</div>;
}

function PositionSelect({ value, onChange }: { value: Position; onChange: (value: Position) => void }) {
  return <label><span>Posição</span><select value={value} onChange={(event) => onChange(event.target.value as Position)}><option value="top-left">Superior esquerda</option><option value="top-center">Superior central</option><option value="top-right">Superior direita</option><option value="center">Centro</option><option value="bottom-left">Inferior esquerda</option><option value="bottom-center">Inferior central</option><option value="bottom-right">Inferior direita</option></select></label>;
}

function FontSize({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label><span>Tamanho do texto</span><input type="number" min="6" max="72" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
