"use client";
/* eslint-disable @next/next/no-img-element */

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  CircleOff,
  CopyPlus,
  Download,
  FileText,
  Grid2X2,
  ImagePlus,
  LockKeyhole,
  LoaderCircle,
  MousePointer2,
  PencilLine,
  Redo2,
  Search,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadBytes } from "@/lib/browser-files";
import { canvasToBlob, loadPdfJsDocument } from "@/lib/pdf-render";
import { formatFileSizeLimit, isFileWithinLimit, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";
import { useTemporaryFiles } from "@/lib/use-temporary-files";
import { SignaturePad } from "./SignaturePad";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_PREVIEW_PIXELS = 1_700_000;
const MAX_SANITIZE_PIXELS = 18_000_000;
const PREVIEW_SCALE = 1.12;
const MIN_SIZE = 12;
const HISTORY_LIMIT = 40;

type ToolMode = "select" | "text" | "comment" | "stamp" | "signature" | "highlight" | "redact" | "pen" | "line" | "arrow" | "rect" | "ellipse";
type StandardFontFamily = "Helvetica" | "Times" | "Courier";
type GoogleFontFamily = "Roboto" | "Open Sans" | "Lato" | "Montserrat" | "Poppins" | "Merriweather" | "Nunito Sans" | "Source Sans 3";
type FontFamily = StandardFontFamily | GoogleFontFamily;

const GOOGLE_FONT_FAMILIES: GoogleFontFamily[] = ["Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Merriweather", "Nunito Sans", "Source Sans 3"];

function isGoogleFontFamily(fontFamily: FontFamily): fontFamily is GoogleFontFamily {
  return GOOGLE_FONT_FAMILIES.includes(fontFamily as GoogleFontFamily);
}

function googleFontCssUrl(fontFamily: GoogleFontFamily, weight = "400;700") {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, "+")}:wght@${weight}&display=swap`;
}

function previewFontFamily(fontFamily: FontFamily) {
  if (fontFamily === "Times") return "Georgia, serif";
  if (fontFamily === "Courier") return "ui-monospace, SFMono-Regular, Menlo, monospace";
  if (fontFamily === "Helvetica") return "Arial, Helvetica, sans-serif";
  return `\"${fontFamily}\", Arial, sans-serif`;
}

async function fetchGoogleFontBytes(fontFamily: GoogleFontFamily, bold: boolean) {
  const cssResponse = await fetch(googleFontCssUrl(fontFamily, bold ? "700" : "400"), { headers: { Accept: "text/css" } });
  if (!cssResponse.ok) throw new Error("Google Fonts CSS indisponível");
  const css = await cssResponse.text();
  const fontUrl = css.match(/src:\s*url\(([^)]+)\)/)?.[1]?.replace(/["']/g, "");
  if (!fontUrl) throw new Error("Arquivo de fonte não encontrado");
  const fontResponse = await fetch(fontUrl);
  if (!fontResponse.ok) throw new Error("Arquivo de fonte indisponível");
  return new Uint8Array(await fontResponse.arrayBuffer());
}
type Point = { x: number; y: number };
type PdfJsDocument = Awaited<ReturnType<typeof loadPdfJsDocument>>;

type PageModel = {
  id: string;
  sourceIndex: number | null;
  width: number;
  height: number;
  scale: number;
  previewUrl: string;
  blank?: boolean;
};

type BaseObject = {
  id: string;
  pageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  opacity: number;
  rotation: number;
  locked?: boolean;
  hidden?: boolean;
};

type TextObject = BaseObject & {
  kind: "text" | "comment" | "stamp";
  text: string;
  fontSize: number;
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
  color: string;
};

type AreaObject = BaseObject & {
  kind: "highlight" | "redact" | "rect" | "ellipse";
  fill: string;
  stroke: string;
  strokeWidth: number;
};

type LineObject = BaseObject & {
  kind: "line" | "arrow";
  stroke: string;
  strokeWidth: number;
  flipY: boolean;
};

type PenObject = BaseObject & {
  kind: "pen";
  stroke: string;
  strokeWidth: number;
  points: Point[];
};

type ImageObject = BaseObject & {
  kind: "image" | "signature";
  dataUrl: string;
  mime: "image/png" | "image/jpeg";
};

type StudioObject = TextObject | AreaObject | LineObject | PenObject | ImageObject;
type Snapshot = { pages: PageModel[]; objects: StudioObject[]; currentPage: number };
type DetectedText = { sourceIndex: number; text: string; x: number; y: number; width: number; height: number };
type SearchHit = { pageId: string; x: number; y: number; width: number; height: number };

type DrawingState = {
  id: string;
  tool: "highlight" | "redact" | "pen" | "line" | "arrow" | "rect" | "ellipse";
  pointerId: number;
  start: Point;
  points: Point[];
};

type DragState = {
  id: string;
  mode: "move" | "resize";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startObject: StudioObject;
  snapshot: Snapshot;
};

function safeScale(width: number, height: number, requested: number, maxPixels: number) {
  return width * height * requested * requested <= maxPixels ? requested : Math.min(requested, Math.sqrt(maxPixels / Math.max(1, width * height)));
}

function pdfSize(page: PageModel) {
  return { width: page.width / page.scale, height: page.height / page.scale };
}

function cloneObject(object: StudioObject): StudioObject {
  return object.kind === "pen" ? { ...object, points: object.points.map((point) => ({ ...point })) } : ({ ...object } as StudioObject);
}

function cloneSnapshot(pages: PageModel[], objects: StudioObject[], currentPage: number): Snapshot {
  return { pages: pages.map((page) => ({ ...page })), objects: objects.map(cloneObject), currentPage };
}

function pushLimited<T>(items: T[], value: T) {
  return [...items.slice(Math.max(0, items.length - HISTORY_LIMIT + 1)), value];
}

function hexColor(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r: .08, g: .1, b: .16 };
  return { r: Number.parseInt(value.slice(0, 2), 16) / 255, g: Number.parseInt(value.slice(2, 4), 16) / 255, b: Number.parseInt(value.slice(4, 6), 16) / 255 };
}

function blankPreview(width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}"><rect width="100%" height="100%" fill="#fff"/><rect x="1" y="1" width="${Math.max(0, Math.ceil(width) - 2)}" height="${Math.max(0, Math.ceil(height) - 2)}" fill="none" stroke="#eef0f3" stroke-width="2"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function dataUrlBytes(dataUrl: string) {
  return fetch(dataUrl).then((response) => response.arrayBuffer());
}

function isTextObject(object: StudioObject): object is TextObject {
  return object.kind === "text" || object.kind === "comment" || object.kind === "stamp";
}

function objectLabel(object: StudioObject) {
  const labels: Record<StudioObject["kind"], string> = {
    text: "Texto", comment: "Comentário", stamp: "Carimbo", highlight: "Destaque", redact: "Redação segura", rect: "Retângulo", ellipse: "Círculo", line: "Linha", arrow: "Seta", pen: "Desenho livre", image: "Imagem", signature: "Assinatura",
  };
  return labels[object.kind];
}

function objectStyle(object: StudioObject, page: PageModel, zoom: number) {
  const size = pdfSize(page);
  const scale = page.scale * zoom;
  return { left: object.x * scale, top: (size.height - object.y - object.height) * scale, width: object.width * scale, height: object.height * scale, opacity: object.opacity, zIndex: object.z, transform: `rotate(${-object.rotation}deg)` };
}

function normalizePen(points: Point[]) {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = Math.max(MIN_SIZE, maxX - minX);
  const height = Math.max(MIN_SIZE, maxY - minY);
  return { x: minX, y: minY, width, height, points: points.map((point) => ({ x: (point.x - minX) / width, y: (point.y - minY) / height })) };
}

async function sanitizedPage(document: PdfJsDocument, sourceIndex: number, redactions: AreaObject[]) {
  const sourcePage = await document.getPage(sourceIndex + 1);
  try {
    const base = sourcePage.getViewport({ scale: 1 });
    const scale = safeScale(base.width, base.height, 2.2, MAX_SANITIZE_PIXELS);
    const viewport = sourcePage.getViewport({ scale });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas indisponível");
    await sourcePage.render({ canvas, canvasContext: context, viewport }).promise;
    context.fillStyle = "#000";
    redactions.forEach((object) => context.fillRect(Math.floor(object.x * scale) - 2, Math.floor(canvas.height - (object.y + object.height) * scale) - 2, Math.ceil(object.width * scale) + 4, Math.ceil(object.height * scale) + 4));
    const blob = await canvasToBlob(canvas, "image/jpeg", .95);
    const bytes = await blob.arrayBuffer();
    canvas.width = 1;
    canvas.height = 1;
    return { bytes, width: base.width, height: base.height };
  } finally {
    sourcePage.cleanup();
  }
}

export function PdfEditorStudio() {
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<DrawingState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const urlsRef = useRef<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] || null;
  const { restored, cached, clearCache } = useTemporaryFiles("tool:editar-pdf-studio", files, setFiles);
  const [pages, setPages] = useState<PageModel[]>([]);
  const [objects, setObjects] = useState<StudioObject[]>([]);
  const [detectedText, setDetectedText] = useState<DetectedText[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolMode>("select");
  const [zoom, setZoom] = useState(.9);
  const [grid, setGrid] = useState(false);
  const [snap, setSnap] = useState(true);
  const [guideX, setGuideX] = useState<number | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "exporting" | "error">("idle");
  const [message, setMessage] = useState("Studio pronto.");
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [stampText, setStampText] = useState("APROVADO");
  const [searchQuery, setSearchQuery] = useState("");
  const [replacementText, setReplacementText] = useState("");
  const [searchIndex, setSearchIndex] = useState(-1);
  const [searchHit, setSearchHit] = useState<SearchHit | null>(null);
  const [fontNotice, setFontNotice] = useState("");

  useEffect(() => {
    window.document.getElementById("editor-pdf-file-input")?.setAttribute("data-editor-ready", "true");
  }, []);

  const page = pages[currentPage] || null;
  const pageCount = page ? Math.max(pages.length, currentPage + 1, 1) : 0;
  const selected = objects.find((object) => object.id === selectedId) || null;
  const pageObjects = useMemo(() => page ? objects.filter((object) => object.pageId === page.id && !object.hidden).sort((a, b) => a.z - b.z) : [], [objects, page]);
  const layers = useMemo(() => page ? objects.filter((object) => object.pageId === page.id).sort((a, b) => b.z - a.z) : [], [objects, page]);
  const nextZ = useMemo(() => Math.max(0, ...objects.map((object) => object.z)) + 1, [objects]);

  useEffect(() => {
    if (!selected || !isTextObject(selected) || !isGoogleFontFamily(selected.fontFamily)) return;
    const linkId = `lim-pdf-google-font-${selected.fontFamily.toLowerCase().replace(/\\s+/g, "-")}`;
    if (window.document.getElementById(linkId)) return;
    const link = window.document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = googleFontCssUrl(selected.fontFamily);
    link.crossOrigin = "anonymous";
    link.onload = () => setFontNotice(`${selected.fontFamily} carregada para visualização e exportação.`);
    link.onerror = () => setFontNotice(`${selected.fontFamily} não pôde ser carregada; o PDF usará uma fonte padrão segura.`);
    window.document.head.appendChild(link);
  }, [selected]);

  const cleanupUrls = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
  }, []);
  useEffect(() => () => cleanupUrls(), [cleanupUrls]);

  const snapshot = useCallback(() => cloneSnapshot(pages, objects, currentPage), [currentPage, objects, pages]);
  const pushHistory = useCallback((value?: Snapshot) => {
    setUndoStack((current) => pushLimited(current, value || snapshot()));
    setRedoStack([]);
  }, [snapshot]);

  const restore = useCallback((value: Snapshot) => {
    setPages(value.pages.map((item) => ({ ...item })));
    setObjects(value.objects.map(cloneObject));
    setCurrentPage(Math.max(0, Math.min(value.currentPage, value.pages.length - 1)));
    setSelectedId(null);
  }, []);

  const undo = useCallback(() => {
    setUndoStack((current) => {
      const previous = current.at(-1);
      if (!previous) return current;
      setRedoStack((redo) => pushLimited(redo, snapshot()));
      restore(previous);
      return current.slice(0, -1);
    });
  }, [restore, snapshot]);

  const redo = useCallback(() => {
    setRedoStack((current) => {
      const next = current.at(-1);
      if (!next) return current;
      setUndoStack((undoHistory) => pushLimited(undoHistory, snapshot()));
      restore(next);
      return current.slice(0, -1);
    });
  }, [restore, snapshot]);

  const openFile = useCallback((selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") return setMessage("Selecione um arquivo PDF.");
    if (!isFileWithinLimit(selectedFile, MAX_LOCAL_PDF_BYTES)) return setMessage(`O PDF ultrapassa ${formatFileSizeLimit()}.`);
    cleanupUrls();
    setFiles([selectedFile]);
  }, [cleanupUrls, setFiles]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    void (async () => {
      setStatus("loading");
      setMessage("Preparando miniaturas e texto pesquisável...");
      try {
        const bytes = await file.arrayBuffer();
        const document = await loadPdfJsDocument(bytes.slice(0));
        const nextPages: PageModel[] = [];
        const nextText: DetectedText[] = [];
        try {
          for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
            if (cancelled) return;
            const sourcePage = await document.getPage(pageNumber);
            try {
              const base = sourcePage.getViewport({ scale: 1 });
              const scale = safeScale(base.width, base.height, PREVIEW_SCALE, MAX_PREVIEW_PIXELS);
              const viewport = sourcePage.getViewport({ scale });
              const canvas = window.document.createElement("canvas");
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              const context = canvas.getContext("2d", { alpha: false });
              if (!context) throw new Error("Canvas indisponível");
              await sourcePage.render({ canvas, canvasContext: context, viewport }).promise;
              const blob = await canvasToBlob(canvas, "image/jpeg", .82);
              const url = URL.createObjectURL(blob);
              urlsRef.current.push(url);
              nextPages.push({ id: `src:${pageNumber - 1}`, sourceIndex: pageNumber - 1, width: canvas.width, height: canvas.height, scale, previewUrl: url });
              const textContent = await sourcePage.getTextContent();
              for (const item of textContent.items as Array<{ str?: string; width?: number; height?: number; transform?: number[] }>) {
                if (!item.str?.trim() || !Array.isArray(item.transform)) continue;
                const fontSize = Math.max(7, Math.hypot(item.transform[0] || 0, item.transform[1] || 0));
                nextText.push({ sourceIndex: pageNumber - 1, text: item.str, x: Math.max(0, (item.transform[4] || 0) - 1), y: Math.max(0, (item.transform[5] || 0) - fontSize * .22), width: Math.max(item.width || fontSize, fontSize), height: Math.max(item.height || fontSize * 1.2, fontSize * 1.15) });
              }
              canvas.width = 1;
              canvas.height = 1;
            } finally {
              sourcePage.cleanup();
            }
          }
        } finally {
          await document.cleanup();
        }
        if (cancelled) return;
        setPages(nextPages);
        setDetectedText(nextText);
        setObjects([]);
        setCurrentPage(0);
        setSelectedId(null);
        setUndoStack([]);
        setRedoStack([]);
        setStatus("ready");
        setMessage("PDF pronto. Escolha uma ferramenta e trabalhe diretamente na página.");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Não foi possível abrir este PDF. Use o Modo preciso se ele exigir compatibilidade adicional.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  function eventPoint(event: React.PointerEvent<HTMLElement>) {
    if (!page || !stageRef.current) return null;
    const rect = stageRef.current.getBoundingClientRect();
    const size = pdfSize(page);
    const scale = page.scale * zoom;
    return { x: Math.max(0, Math.min(size.width, (event.clientX - rect.left) / scale)), y: Math.max(0, Math.min(size.height, size.height - (event.clientY - rect.top) / scale)) };
  }

  function addText(point: Point, kind: TextObject["kind"]) {
    if (!page) return;
    pushHistory();
    const id = crypto.randomUUID();
    const object: TextObject = {
      id, pageId: page.id, kind,
      text: kind === "comment" ? "Comentário" : kind === "stamp" ? stampText : "Novo texto",
      x: point.x, y: point.y - (kind === "comment" ? 58 : 28), width: kind === "comment" ? 180 : kind === "stamp" ? 150 : 170, height: kind === "comment" ? 64 : 32,
      z: nextZ, opacity: 1, rotation: 0, fontSize: kind === "stamp" ? 18 : kind === "comment" ? 10 : 18, fontFamily: "Helvetica", bold: kind === "stamp", italic: false, color: kind === "stamp" ? "#d40d18" : "#111827",
    };
    setObjects((current) => [...current, object]);
    setSelectedId(id);
    setTool("select");
  }

  function beginStage(event: React.PointerEvent<HTMLDivElement>) {
    if (!page || status !== "ready") return;
    const point = eventPoint(event);
    if (!point) return;
    if (tool === "select") {
      if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains("studio-page-image")) setSelectedId(null);
      return;
    }
    if (tool === "text" || tool === "comment" || tool === "stamp") return addText(point, tool);
    if (tool === "signature") {
      if (!signatureDataUrl) return setMessage("Desenhe sua assinatura no painel direito antes de inserir.");
      pushHistory();
      const id = crypto.randomUUID();
      const object: ImageObject = { id, pageId: page.id, kind: "signature", dataUrl: signatureDataUrl, mime: "image/png", x: point.x, y: point.y - 55, width: 170, height: 55, z: nextZ, opacity: 1, rotation: 0 };
      setObjects((current) => [...current, object]);
      setSelectedId(id);
      setTool("select");
      return;
    }
    if (["highlight", "redact", "pen", "line", "arrow", "rect", "ellipse"].includes(tool)) {
      const drawTool = tool as DrawingState["tool"];
      const id = crypto.randomUUID();
      pushHistory();
      drawingRef.current = { id, tool: drawTool, pointerId: event.pointerId, start: point, points: [point] };
      event.currentTarget.setPointerCapture(event.pointerId);
      if (drawTool === "pen") {
        setObjects((current) => [...current, { id, pageId: page.id, kind: "pen", x: point.x, y: point.y, width: MIN_SIZE, height: MIN_SIZE, z: nextZ, opacity: 1, rotation: 0, stroke: "#1c2430", strokeWidth: 2.2, points: [{ x: .5, y: .5 }] }]);
      } else if (drawTool === "line" || drawTool === "arrow") {
        setObjects((current) => [...current, { id, pageId: page.id, kind: drawTool, x: point.x, y: point.y, width: MIN_SIZE, height: MIN_SIZE, z: nextZ, opacity: 1, rotation: 0, stroke: "#e10f19", strokeWidth: 2.2, flipY: false }]);
      } else {
        const fill = drawTool === "highlight" ? "#ffe15a" : drawTool === "redact" ? "#000000" : "#ffffff";
        const stroke = drawTool === "highlight" ? "#f1b600" : drawTool === "redact" ? "#000000" : "#e10f19";
        setObjects((current) => [...current, { id, pageId: page.id, kind: drawTool, x: point.x, y: point.y, width: MIN_SIZE, height: MIN_SIZE, z: nextZ, opacity: drawTool === "highlight" ? .42 : 1, rotation: 0, fill, stroke, strokeWidth: 2 }]);
      }
      setSelectedId(id);
    }
  }

  function moveStage(event: React.PointerEvent<HTMLDivElement>) {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    const point = eventPoint(event);
    if (!point) return;
    if (drawing.tool === "pen") {
      drawing.points.push(point);
      const normalized = normalizePen(drawing.points);
      setObjects((current) => current.map((object) => object.id === drawing.id && object.kind === "pen" ? { ...object, ...normalized } : object));
      return;
    }
    const x = Math.min(drawing.start.x, point.x);
    const y = Math.min(drawing.start.y, point.y);
    const width = Math.max(MIN_SIZE, Math.abs(point.x - drawing.start.x));
    const height = Math.max(MIN_SIZE, Math.abs(point.y - drawing.start.y));
    setObjects((current) => current.map((object) => object.id === drawing.id ? ({ ...object, x, y, width, height, ...((object.kind === "line" || object.kind === "arrow") ? { flipY: point.y < drawing.start.y } : {}) } as StudioObject) : object));
  }

  function endStage(event: React.PointerEvent<HTMLDivElement>) {
    if (!drawingRef.current || drawingRef.current.pointerId !== event.pointerId) return;
    drawingRef.current = null;
    setTool("select");
    setMessage("Elemento criado. Use o painel direito para acabamento fino.");
  }

  function snapped(object: StudioObject, x: number, y: number) {
    if (!page || !snap) return { x, y };
    const size = pdfSize(page);
    let nextX = Math.round(x / 5) * 5;
    let nextY = Math.round(y / 5) * 5;
    if (Math.abs(nextX + object.width / 2 - size.width / 2) < 6) { nextX = size.width / 2 - object.width / 2; setGuideX(size.width / 2); } else setGuideX(null);
    if (Math.abs(nextY + object.height / 2 - size.height / 2) < 6) { nextY = size.height / 2 - object.height / 2; setGuideY(size.height / 2); } else setGuideY(null);
    return { x: Math.max(0, Math.min(size.width - object.width, nextX)), y: Math.max(0, Math.min(size.height - object.height, nextY)) };
  }

  function beginDrag(event: React.PointerEvent<HTMLElement>, object: StudioObject, mode: "move" | "resize") {
    if (!page) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(object.id);
    if (object.locked) return setMessage("Camada bloqueada. Desbloqueie para mover ou redimensionar.");
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: object.id, mode, pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startObject: cloneObject(object), snapshot: snapshot() };
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !page) return;
    event.preventDefault();
    const scale = page.scale * zoom;
    const dx = (event.clientX - drag.startClientX) / scale;
    const dy = (event.clientY - drag.startClientY) / scale;
    setObjects((current) => current.map((object) => {
      if (object.id !== drag.id) return object;
      if (drag.mode === "move") return { ...object, ...snapped(drag.startObject, drag.startObject.x + dx, drag.startObject.y - dy) } as StudioObject;
      const width = Math.max(MIN_SIZE, drag.startObject.width + dx);
      const height = Math.max(MIN_SIZE, drag.startObject.height + dy);
      return { ...object, width, height, y: drag.startObject.y - (height - drag.startObject.height) } as StudioObject;
    }));
  }

  function endDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setUndoStack((current) => pushLimited(current, drag.snapshot));
    setRedoStack([]);
    dragRef.current = null;
    setGuideX(null);
    setGuideY(null);
  }

  async function addImage(imageFile: File) {
    if (!page) return;
    if (!["image/png", "image/jpeg"].includes(imageFile.type)) return setMessage("Use uma imagem PNG ou JPG.");
    if (imageFile.size > MAX_IMAGE_SIZE) return setMessage("A imagem ultrapassa 8 MB.");
    try {
      const dataUrl = await fileToDataUrl(imageFile);
      pushHistory();
      const id = crypto.randomUUID();
      setObjects((current) => [...current, { id, pageId: page.id, kind: "image", dataUrl, mime: imageFile.type as ImageObject["mime"], x: 55, y: 65, width: 190, height: 130, z: nextZ, opacity: 1, rotation: 0 }]);
      setSelectedId(id);
    } catch {
      setMessage("Não foi possível carregar essa imagem.");
    }
  }

  function updateSelected(patch: Partial<StudioObject>) {
    if (!selected) return;
    pushHistory();
    setObjects((current) => current.map((object) => object.id === selected.id ? ({ ...object, ...patch } as StudioObject) : object));
  }

  function deleteSelected() {
    if (!selected || selected.locked) return;
    pushHistory();
    setObjects((current) => current.filter((object) => object.id !== selected.id));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected) return;
    pushHistory();
    const copy = cloneObject(selected);
    copy.id = crypto.randomUUID();
    copy.x += 14;
    copy.y -= 14;
    copy.z = nextZ;
    copy.locked = false;
    copy.hidden = false;
    setObjects((current) => [...current, copy]);
    setSelectedId(copy.id);
  }

  function movePage(direction: -1 | 1) {
    const target = currentPage + direction;
    if (target < 0 || target >= pages.length) return;
    pushHistory();
    setPages((current) => { const next = [...current]; [next[currentPage], next[target]] = [next[target], next[currentPage]]; return next; });
    setCurrentPage(target);
  }

  function duplicatePage() {
    if (!page) return;
    pushHistory();
    const pageCopy: PageModel = { ...page, id: `copy:${crypto.randomUUID()}` };
    const layerCopies = objects.filter((object) => object.pageId === page.id).map((object, index) => ({ ...cloneObject(object), id: crypto.randomUUID(), pageId: pageCopy.id, z: nextZ + index } as StudioObject));
    setPages((current) => [...current.slice(0, currentPage + 1), pageCopy, ...current.slice(currentPage + 1)]);
    setObjects((current) => [...current, ...layerCopies]);
    setCurrentPage(currentPage + 1);
    setSelectedId(null);
  }

  function insertBlankPage() {
    if (!page) return;
    pushHistory();
    const pageCopy: PageModel = { ...page, id: `blank:${crypto.randomUUID()}`, sourceIndex: null, previewUrl: blankPreview(page.width, page.height), blank: true };
    setPages((current) => [...current.slice(0, currentPage + 1), pageCopy, ...current.slice(currentPage + 1)]);
    setCurrentPage(currentPage + 1);
    setSelectedId(null);
  }

  function deletePage() {
    if (!page || pages.length <= 1) return setMessage("O documento precisa manter pelo menos uma página.");
    pushHistory();
    setObjects((current) => current.filter((object) => object.pageId !== page.id));
    setPages((current) => current.filter((item) => item.id !== page.id));
    setCurrentPage(Math.max(0, Math.min(currentPage, pages.length - 2)));
    setSelectedId(null);
  }

  function searchMatch() {
    const query = searchQuery.trim().toLocaleLowerCase("pt-BR");
    if (!query) { setMessage("Digite um texto para localizar."); return null; }
    const matches = detectedText.filter((item) => item.text.toLocaleLowerCase("pt-BR").includes(query));
    if (!matches.length) { setSearchHit(null); setMessage("Texto não encontrado na camada pesquisável."); return null; }
    const nextIndex = (searchIndex + 1) % matches.length;
    const match = matches[nextIndex];
    const pageIndex = pages.findIndex((item) => item.sourceIndex === match.sourceIndex);
    if (pageIndex < 0) return null;
    const targetPage = pages[pageIndex];
    setCurrentPage(pageIndex);
    setSelectedId(null);
    setSearchIndex(nextIndex);
    setSearchHit({ pageId: targetPage.id, x: match.x, y: match.y, width: match.width, height: match.height });
    return { match, matches, targetPage, nextIndex };
  }

  function findNextText() {
    const result = searchMatch();
    if (!result) return;
    setMessage(`Ocorrência ${result.nextIndex + 1} de ${result.matches.length}.`);
  }

  function replaceNextText() {
    const replacement = replacementText.trim();
    if (!replacement) return setMessage("Digite o texto de substituição antes de aplicar.");
    const result = searchMatch();
    if (!result) return;
    const { match, matches, targetPage, nextIndex } = result;
    const redactionId = crypto.randomUUID();
    const textId = crypto.randomUUID();
    const height = Math.max(12, match.height * 1.15);
    pushHistory();
    setObjects((current) => [...current,
      { id: redactionId, pageId: targetPage.id, kind: "redact", x: match.x - 1, y: match.y - 1, width: Math.max(match.width + 2, replacement.length * match.height * .52), height, z: nextZ, opacity: 1, rotation: 0, fill: "#000000", stroke: "#000000", strokeWidth: 0 },
      { id: textId, pageId: targetPage.id, kind: "text", text: replacement, x: match.x + 2, y: match.y, width: Math.max(match.width, replacement.length * match.height * .52), height, z: nextZ + 1, opacity: 1, rotation: 0, fontSize: Math.max(8, match.height * .78), fontFamily: "Helvetica", bold: false, italic: false, color: "#111827" },
    ]);
    setSelectedId(textId);
    setMessage(`Texto substituído localmente. Ocorrência ${nextIndex + 1} de ${matches.length}; o conteúdo anterior será sanitizado no PDF exportado.`);
  }

  async function exportPdf() {
    if (!file || !pages.length) return;
    setStatus("exporting");
    setMessage("Aplicando camadas e sanitizando redações...");
    let renderDocument: PdfJsDocument | null = null;
    try {
      const pdfLib = await import("pdf-lib");
      const fontkitModule = await import("@pdf-lib/fontkit");
      const sourceBytes = await file.arrayBuffer();
      const sourcePdf = await pdfLib.PDFDocument.load(sourceBytes.slice(0));
      const output = await pdfLib.PDFDocument.create();
      output.registerFontkit(fontkitModule);
      const fontCache = new Map<string, Awaited<ReturnType<typeof output.embedFont>>>();
      const getFont = async (object: TextObject) => {
        const fontKey = `${object.fontFamily}:${object.bold ? "700" : "400"}`;
        if (fontCache.has(fontKey)) return fontCache.get(fontKey)!;
        if (isGoogleFontFamily(object.fontFamily)) {
          try {
            const font = await output.embedFont(await fetchGoogleFontBytes(object.fontFamily, object.bold), { subset: true });
            fontCache.set(fontKey, font);
            setFontNotice(`${object.fontFamily} incorporada no PDF exportado.`);
            return font;
          } catch {
            setFontNotice(`${object.fontFamily} não pôde ser incorporada; foi aplicado fallback Helvetica.`);
          }
        }
        let fontName: string = pdfLib.StandardFonts.Helvetica;
        if (object.fontFamily === "Helvetica") fontName = object.bold && object.italic ? pdfLib.StandardFonts.HelveticaBoldOblique : object.bold ? pdfLib.StandardFonts.HelveticaBold : object.italic ? pdfLib.StandardFonts.HelveticaOblique : pdfLib.StandardFonts.Helvetica;
        if (object.fontFamily === "Times") fontName = object.bold && object.italic ? pdfLib.StandardFonts.TimesRomanBoldItalic : object.bold ? pdfLib.StandardFonts.TimesRomanBold : object.italic ? pdfLib.StandardFonts.TimesRomanItalic : pdfLib.StandardFonts.TimesRoman;
        if (object.fontFamily === "Courier") fontName = object.bold && object.italic ? pdfLib.StandardFonts.CourierBoldOblique : object.bold ? pdfLib.StandardFonts.CourierBold : object.italic ? pdfLib.StandardFonts.CourierOblique : pdfLib.StandardFonts.Courier;
        if (!fontCache.has(fontKey)) fontCache.set(fontKey, await output.embedFont(fontName));
        return fontCache.get(fontKey)!;
      };
      const hasRedactions = objects.some((object) => object.kind === "redact");
      if (hasRedactions) renderDocument = await loadPdfJsDocument(sourceBytes.slice(0));

      for (const item of pages) {
        const visible = objects.filter((object) => object.pageId === item.id && !object.hidden).sort((a, b) => a.z - b.z);
        const redactions = visible.filter((object): object is AreaObject => object.kind === "redact");
        let targetPage;
        if (item.sourceIndex === null) {
          const size = pdfSize(item);
          targetPage = output.addPage([size.width, size.height]);
        } else if (redactions.length && renderDocument) {
          const sanitized = await sanitizedPage(renderDocument, item.sourceIndex, redactions);
          targetPage = output.addPage([sanitized.width, sanitized.height]);
          const image = await output.embedJpg(sanitized.bytes);
          targetPage.drawImage(image, { x: 0, y: 0, width: sanitized.width, height: sanitized.height });
        } else {
          const [copied] = await output.copyPages(sourcePdf, [item.sourceIndex]);
          targetPage = output.addPage(copied);
        }

        for (const object of visible) {
          if (object.kind === "redact") {
            targetPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, color: pdfLib.rgb(0, 0, 0), opacity: object.opacity });
            continue;
          }
          if (object.kind === "highlight") {
            const color = hexColor(object.fill);
            targetPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, color: pdfLib.rgb(color.r, color.g, color.b), opacity: Math.min(.7, object.opacity) });
            continue;
          }
          if (object.kind === "rect") {
            const color = hexColor(object.stroke);
            targetPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, borderColor: pdfLib.rgb(color.r, color.g, color.b), borderWidth: object.strokeWidth, opacity: object.opacity, rotate: pdfLib.degrees(object.rotation) });
            continue;
          }
          if (object.kind === "ellipse") {
            const color = hexColor(object.stroke);
            targetPage.drawEllipse({ x: object.x + object.width / 2, y: object.y + object.height / 2, xScale: object.width / 2, yScale: object.height / 2, borderColor: pdfLib.rgb(color.r, color.g, color.b), borderWidth: object.strokeWidth, opacity: object.opacity });
            continue;
          }
          if (object.kind === "line" || object.kind === "arrow") {
            const color = hexColor(object.stroke);
            const start = object.flipY ? { x: object.x, y: object.y + object.height } : { x: object.x, y: object.y };
            const end = object.flipY ? { x: object.x + object.width, y: object.y } : { x: object.x + object.width, y: object.y + object.height };
            targetPage.drawLine({ start, end, thickness: object.strokeWidth, color: pdfLib.rgb(color.r, color.g, color.b), opacity: object.opacity });
            if (object.kind === "arrow") {
              const angle = Math.atan2(end.y - start.y, end.x - start.x);
              const head = Math.max(8, object.strokeWidth * 4.5);
              const left = { x: end.x - head * Math.cos(angle - Math.PI / 6), y: end.y - head * Math.sin(angle - Math.PI / 6) };
              const right = { x: end.x - head * Math.cos(angle + Math.PI / 6), y: end.y - head * Math.sin(angle + Math.PI / 6) };
              targetPage.drawLine({ start: end, end: left, thickness: object.strokeWidth, color: pdfLib.rgb(color.r, color.g, color.b), opacity: object.opacity });
              targetPage.drawLine({ start: end, end: right, thickness: object.strokeWidth, color: pdfLib.rgb(color.r, color.g, color.b), opacity: object.opacity });
            }
            continue;
          }
          if (object.kind === "pen") {
            const color = hexColor(object.stroke);
            for (let index = 1; index < object.points.length; index += 1) {
              const previous = object.points[index - 1];
              const current = object.points[index];
              targetPage.drawLine({ start: { x: object.x + previous.x * object.width, y: object.y + previous.y * object.height }, end: { x: object.x + current.x * object.width, y: object.y + current.y * object.height }, thickness: object.strokeWidth, color: pdfLib.rgb(color.r, color.g, color.b), opacity: object.opacity });
            }
            continue;
          }
          if (object.kind === "image" || object.kind === "signature") {
            const bytes = await dataUrlBytes(object.dataUrl);
            const image = object.mime === "image/jpeg" ? await output.embedJpg(bytes) : await output.embedPng(bytes);
            targetPage.drawImage(image, { x: object.x, y: object.y, width: object.width, height: object.height, opacity: object.opacity, rotate: pdfLib.degrees(object.rotation) });
            continue;
          }
          if (!isTextObject(object)) continue;
          const font = await getFont(object);
          const color = hexColor(object.color);
          if (object.kind === "comment") targetPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, color: pdfLib.rgb(1, .96, .72), borderColor: pdfLib.rgb(.92, .64, .12), borderWidth: 1, opacity: object.opacity });
          if (object.kind === "stamp") targetPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, borderColor: pdfLib.rgb(.84, .05, .09), borderWidth: 2.2, opacity: object.opacity });
          if (!object.text.trim()) continue;
          targetPage.drawText(object.text, { x: object.x + (object.kind === "comment" ? 6 : 0), y: object.y + (object.kind === "comment" ? object.height - object.fontSize - 6 : Math.max(1, object.height * .18)), size: Math.max(6, Math.min(120, object.fontSize)), font, color: pdfLib.rgb(color.r, color.g, color.b), maxWidth: Math.max(20, object.width - (object.kind === "comment" ? 12 : 0)), opacity: object.opacity, rotate: pdfLib.degrees(object.rotation) });
        }
      }
      downloadBytes(await output.save({ useObjectStreams: true }), `${file.name.replace(/\.pdf$/i, "")}-studio-lim-pdf.pdf`);
      setStatus("ready");
      setMessage(hasRedactions ? "PDF exportado. As áreas redigidas foram rasterizadas e sanitizadas antes da exportação." : "PDF exportado com todas as camadas do Studio.");
    } catch {
      setStatus("error");
      setMessage("Não foi possível exportar. Remova a última camada ou use o Modo preciso para este arquivo.");
    } finally {
      if (renderDocument) {
        try { await renderDocument.cleanup(); } catch { /* no-op */ }
      }
    }
  }

  function closeDocument() {
    cleanupUrls();
    setFiles([]);
    setPages([]);
    setObjects([]);
    setDetectedText([]);
    setCurrentPage(0);
    setSelectedId(null);
    setUndoStack([]);
    setRedoStack([]);
    setTool("select");
    clearCache();
    setStatus("idle");
  }

  if (!file) {
    return <section className="studio-upload-card"><span className="studio-upload-icon"><UploadCloud size={32} /></span><span className="studio-kicker"><Sparkles size={14} /> Studio 2.0</span><h2>Edite o PDF como em um aplicativo</h2><p>Desenho livre, formas, setas, tipografia, carimbos, comentários, imagens, assinatura e redação segura — tudo no navegador.</p><button className="primary-button large-button" type="button" onClick={() => pdfInputRef.current?.click()}><FileText size={18} /> Abrir PDF</button><input id="editor-pdf-file-input" data-editor-ready="false" ref={pdfInputRef} hidden type="file" accept="application/pdf" onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => event.target.files?.[0] && openFile(event.target.files[0])} /><div className="studio-upload-features"><span><ShieldCheck size={15} /> Processamento local</span><span><PencilLine size={15} /> Ferramentas criativas</span><span><Grid2X2 size={15} /> Guias inteligentes</span></div></section>;
  }

  return <section className="studio-shell">
    <header className="studio-topbar"><div className="studio-file"><FileText size={18} /><span><strong>{file.name}</strong><small>{cached ? "Arquivo temporário protegido neste navegador" : "Sessão local"}{restored ? " · recuperada" : ""}</small></span></div><div className="studio-history"><button type="button" onClick={undo} disabled={!undoStack.length}><Undo2 size={16} /></button><button type="button" onClick={redo} disabled={!redoStack.length}><Redo2 size={16} /></button></div><div className="studio-view-controls"><button type="button" className={grid ? "active" : ""} onClick={() => setGrid((value) => !value)}><Grid2X2 size={15} /> Grade</button><button type="button" className={snap ? "active" : ""} onClick={() => setSnap((value) => !value)}><SlidersHorizontal size={15} /> Snap</button><div><button type="button" onClick={() => setZoom((value) => Math.max(.5, Number((value - .1).toFixed(2))))}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.7, Number((value + .1).toFixed(2))))}>+</button></div></div><div className="studio-top-actions"><button className="secondary-button" type="button" onClick={closeDocument}>Fechar</button><button className="primary-button" type="button" onClick={exportPdf} disabled={status === "loading" || status === "exporting"}>{status === "exporting" ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />} Baixar PDF</button></div></header>
    <div className="studio-body">
      <aside className="studio-tools">{([ ["select","Selecionar",MousePointer2], ["text","Texto",Type], ["pen","Caneta",PencilLine], ["highlight","Destacar",PencilLine], ["line","Linha",ArrowRight], ["arrow","Seta",ArrowRight], ["rect","Retângulo",Grid2X2], ["ellipse","Círculo",CircleOff], ["redact","Redigir",ShieldCheck], ["comment","Comentário",FileText], ["stamp","Carimbo",CheckCircle2], ["signature","Assinar",Signature] ] as const).map(([id,label,Icon]) => <button key={id} type="button" className={tool === id ? "active" : ""} onClick={() => setTool(id)}><Icon size={19} /><span>{label}</span></button>)}<button type="button" onClick={() => imageInputRef.current?.click()}><ImagePlus size={19} /><span>Imagem</span></button><input ref={imageInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => event.target.files?.[0] && void addImage(event.target.files[0])} /></aside>
      <aside className="studio-pages"><div className="studio-pages-heading"><strong>Páginas</strong><span key={`page-count-${pageCount}`} aria-live="polite">{pageCount}</span></div><div className="studio-page-actions"><button type="button" onClick={() => movePage(-1)} disabled={currentPage === 0}><ArrowUp size={13} /></button><button type="button" onClick={() => movePage(1)} disabled={currentPage === pageCount - 1}><ArrowDown size={13} /></button><button type="button" onClick={duplicatePage}>Duplicar</button><button type="button" onClick={insertBlankPage}>Em branco</button><button type="button" onClick={deletePage} disabled={pageCount <= 1}>Excluir</button></div><div className="studio-page-list">{pages.map((item,index) => <button type="button" key={item.id} className={index === currentPage ? "active" : ""} onClick={() => { setCurrentPage(index); setSelectedId(null); setSearchHit(null); }}><img src={item.previewUrl} alt={`Página ${index + 1}`} /><span>{index + 1}</span>{item.blank ? <small>em branco</small> : null}</button>)}</div></aside>
      <main className={`studio-canvas-wrap ${grid ? "show-grid" : ""}`}>{status === "loading" ? <div className="studio-loading"><LoaderCircle className="spin" size={26} /><strong>Preparando Studio</strong><p>{message}</p></div> : null}{page ? <div className="studio-stage" ref={stageRef} style={{ width: page.width * zoom, height: page.height * zoom }} onPointerDown={beginStage} onPointerMove={moveStage} onPointerUp={endStage} onPointerCancel={endStage}><img className="studio-page-image" src={page.previewUrl} alt={`Página ${currentPage + 1}`} draggable={false} />{guideX !== null ? <span className="studio-guide vertical" style={{ left: guideX * page.scale * zoom }} /> : null}{guideY !== null ? <span className="studio-guide horizontal" style={{ bottom: guideY * page.scale * zoom }} /> : null}{searchHit?.pageId === page.id ? <span className="studio-search-hit" style={{ left: searchHit.x * page.scale * zoom, top: (pdfSize(page).height - searchHit.y - searchHit.height) * page.scale * zoom, width: searchHit.width * page.scale * zoom, height: searchHit.height * page.scale * zoom }} /> : null}{pageObjects.map((object) => <button key={object.id} type="button" className={`studio-object kind-${object.kind} ${selectedId === object.id ? "selected" : ""} ${object.locked ? "locked" : ""}`} style={objectStyle(object,page,zoom)} title={objectLabel(object)} onPointerDown={(event) => beginDrag(event,object,"move")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>{isTextObject(object) ? <span className="studio-text" style={{ color: object.color, fontSize: object.fontSize * page.scale * zoom, fontFamily: previewFontFamily(object.fontFamily), fontWeight: object.bold ? 800 : 400, fontStyle: object.italic ? "italic" : "normal" }}>{object.text}</span> : null}{object.kind === "highlight" ? <span className="studio-area" style={{ background: object.fill }} /> : null}{object.kind === "redact" ? <span className="studio-area studio-redaction">REDACTED</span> : null}{object.kind === "rect" ? <span className="studio-shape-rect" style={{ borderColor: object.stroke, borderWidth: object.strokeWidth }} /> : null}{object.kind === "ellipse" ? <span className="studio-shape-ellipse" style={{ borderColor: object.stroke, borderWidth: object.strokeWidth }} /> : null}{object.kind === "line" || object.kind === "arrow" ? <svg className="studio-line" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1={object.flipY ? 0 : 100} x2="100" y2={object.flipY ? 100 : 0} stroke={object.stroke} strokeWidth={Math.max(1,object.strokeWidth * 2)} vectorEffect="non-scaling-stroke" />{object.kind === "arrow" ? <polyline points={object.flipY ? "84,78 100,100 78,84" : "80,16 100,0 84,22"} fill="none" stroke={object.stroke} strokeWidth={Math.max(1,object.strokeWidth * 2)} vectorEffect="non-scaling-stroke" /> : null}</svg> : null}{object.kind === "pen" ? <svg className="studio-pen" viewBox={`0 0 ${Math.max(1,object.width)} ${Math.max(1,object.height)}`} preserveAspectRatio="none"><polyline points={object.points.map((point) => `${point.x * object.width},${(1-point.y) * object.height}`).join(" ")} fill="none" stroke={object.stroke} strokeWidth={object.strokeWidth} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}{object.kind === "image" || object.kind === "signature" ? <img src={object.dataUrl} alt={objectLabel(object)} draggable={false} /> : null}{selectedId === object.id && !object.locked && object.kind !== "pen" ? <span className="studio-resize-handle" onPointerDown={(event) => beginDrag(event,object,"resize")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} /> : null}</button>)}</div> : null}<div className="studio-canvas-status"><span>{tool === "select" ? "Selecione um elemento para editar" : `Ferramenta ${tool}: clique e arraste na página`}</span><span key={`page-status-${page?.id || "empty"}-${currentPage}-${pageCount}`} aria-live="polite">Página {page ? currentPage + 1 : 0} de {pageCount}</span></div></main>
      <aside className="studio-properties"><div className="studio-properties-head"><strong>Propriedades</strong>{selected ? <button type="button" onClick={deleteSelected}><Trash2 size={14} /> Excluir</button> : null}</div>{selected ? <div className="studio-properties-content"><div className="studio-object-summary"><span>{objectLabel(selected)}</span><div><button type="button" onClick={duplicateSelected}><CopyPlus size={14} /> Duplicar</button><button type="button" onClick={() => updateSelected({ locked: !selected.locked } as Partial<StudioObject>)}><LockKeyhole size={14} /> {selected.locked ? "Desbloquear" : "Bloquear"}</button><button type="button" onClick={() => updateSelected({ hidden: !selected.hidden } as Partial<StudioObject>)}><CircleOff size={14} /> {selected.hidden ? "Mostrar" : "Ocultar"}</button></div></div>{isTextObject(selected) ? <><label><span>Conteúdo</span><textarea value={selected.text} disabled={selected.locked} onChange={(event) => setObjects((current) => current.map((object) => object.id === selected.id && isTextObject(object) ? { ...object, text: event.target.value } : object))} /></label><div className="studio-two-cols"><label><span>Fonte</span><select value={selected.fontFamily} disabled={selected.locked} onChange={(event) => { setFontNotice(""); updateSelected({ fontFamily: event.target.value as FontFamily } as Partial<StudioObject>); }}><optgroup label="PDF seguro"><option>Helvetica</option><option>Times</option><option>Courier</option></optgroup><optgroup label="Google Fonts · Premium">{GOOGLE_FONT_FAMILIES.map((family) => <option key={family} value={family}>{family}</option>)}</optgroup></select></label><label><span>Tamanho</span><input type="number" min="6" max="120" value={selected.fontSize} disabled={selected.locked} onChange={(event) => updateSelected({ fontSize: Number(event.target.value) || 12 } as Partial<StudioObject>)} /></label></div><div className="studio-format-row"><button type="button" className={selected.bold ? "active" : ""} onClick={() => updateSelected({ bold: !selected.bold } as Partial<StudioObject>)}>B</button><button type="button" className={selected.italic ? "active" : ""} onClick={() => updateSelected({ italic: !selected.italic } as Partial<StudioObject>)}><em>I</em></button></div><label><span>Cor do texto</span><input type="color" value={selected.color} disabled={selected.locked} onChange={(event) => updateSelected({ color: event.target.value } as Partial<StudioObject>)} /></label></> : null}{(selected.kind === "rect" || selected.kind === "ellipse" || selected.kind === "line" || selected.kind === "arrow" || selected.kind === "pen") ? <div className="studio-two-cols"><label><span>Cor</span><input type="color" value={selected.stroke} onChange={(event) => updateSelected({ stroke: event.target.value } as Partial<StudioObject>)} /></label><label><span>Espessura</span><input type="number" min="1" max="16" value={selected.strokeWidth} onChange={(event) => updateSelected({ strokeWidth: Number(event.target.value) || 1 } as Partial<StudioObject>)} /></label></div> : null}{selected.kind === "highlight" ? <label><span>Cor do destaque</span><input type="color" value={selected.fill} onChange={(event) => updateSelected({ fill: event.target.value } as Partial<StudioObject>)} /></label> : null}<div className="studio-two-cols">{(isTextObject(selected) || selected.kind === "image" || selected.kind === "signature" || selected.kind === "rect") ? <label><span>Rotação</span><input type="number" min="-180" max="180" value={selected.rotation} onChange={(event) => updateSelected({ rotation: Number(event.target.value) || 0 } as Partial<StudioObject>)} /></label> : <span /> }<label><span>Opacidade</span><input type="range" min="0.1" max="1" step="0.05" value={selected.opacity} onChange={(event) => updateSelected({ opacity: Number(event.target.value) } as Partial<StudioObject>)} /></label></div>{fontNotice ? <small className="studio-font-notice" role="status">{fontNotice}</small> : null}</div> : <div className="studio-empty-properties"><MousePointer2 size={26} /><strong>Nada selecionado</strong><p>Escolha uma ferramenta à esquerda ou clique em uma camada da página.</p></div>}<div className="studio-find-replace"><div><Search size={15} /><strong>Localizar texto</strong></div><input value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setSearchIndex(-1); }} placeholder="Buscar no PDF" /><button type="button" onClick={findNextText}>Localizar próxima ocorrência</button><input value={replacementText} onChange={(event) => setReplacementText(event.target.value)} placeholder="Substituir por" /><button type="button" onClick={replaceNextText}>Substituir ocorrência</button><small>A substituição é local: o conteúdo anterior é rasterizado e sanitizado no PDF exportado.</small></div><div className="studio-stamps"><strong>Carimbos</strong><select value={stampText} onChange={(event) => setStampText(event.target.value)}><option>APROVADO</option><option>ASSINADO</option><option>CONFIDENCIAL</option><option>REVISADO</option><option>URGENTE</option><option>CANCELADO</option></select><button type="button" onClick={() => setTool("stamp")}>Inserir carimbo</button></div><div className="studio-signature"><strong>Assinatura</strong><SignaturePad onChange={setSignatureDataUrl} /><button type="button" disabled={!signatureDataUrl} onClick={() => setTool("signature")}>Inserir na página</button></div><div className="studio-layers"><div><strong>Camadas</strong><span>{layers.length}</span></div>{layers.length ? layers.map((object) => <button type="button" className={selectedId === object.id ? "active" : ""} key={object.id} onClick={() => setSelectedId(object.id)}><span>{objectLabel(object)}</span><small>{object.locked ? "Bloqueada" : object.hidden ? "Oculta" : "Editável"}</small></button>) : <small>Nenhuma camada nesta página.</small>}</div></aside>
    </div>
    <footer className={`studio-status ${status === "error" ? "error" : ""}`}><span>{status === "exporting" ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}{message}</span><span><ShieldCheck size={15} /> Processamento local e privado</span></footer>
  </section>;
}
