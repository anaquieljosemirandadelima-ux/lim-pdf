"use client";
/* eslint-disable @next/next/no-img-element */

import {
  ArrowDown,
  ArrowLeft,
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
import { useTemporaryFiles } from "@/lib/use-temporary-files";
import { SignaturePad } from "./SignaturePad";

const MAX_FILE_SIZE = 60 * 1024 * 1024;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const PREVIEW_SCALE = 1.12;
const MAX_PREVIEW_PIXELS = 1_700_000;
const MAX_SANITIZE_PIXELS = 18_000_000;
const MIN_SIZE = 12;
const HISTORY_LIMIT = 45;

type ToolMode = "select" | "text" | "highlight" | "redact" | "comment" | "pen" | "line" | "arrow" | "rect" | "ellipse" | "stamp" | "signature";
type FontFamily = "Helvetica" | "Times" | "Courier";
type Align = "left" | "center" | "right";
type Point = { x: number; y: number };

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
  rotation: number;
  opacity: number;
  locked?: boolean;
  hidden?: boolean;
};

type TextObject = BaseObject & {
  kind: "text" | "comment" | "stamp" | "replacement";
  text: string;
  fontSize: number;
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
  color: string;
  align: Align;
  originalText?: string;
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
type DetectedText = { sourceIndex: number; text: string; x: number; y: number; width: number; height: number; fontSize: number };
type PdfJsDocument = Awaited<ReturnType<typeof loadPdfJsDocument>>;

type DragState = {
  mode: "move" | "resize";
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  start: StudioObject;
  snapshot: Snapshot;
};

type DrawingState = {
  id: string;
  tool: "highlight" | "redact" | "pen" | "line" | "arrow" | "rect" | "ellipse";
  pointerId: number;
  start: Point;
  rawPoints: Point[];
};

function safeScale(width: number, height: number, requested: number, maxPixels: number) {
  if (width * height * requested * requested <= maxPixels) return requested;
  return Math.min(requested, Math.sqrt(maxPixels / Math.max(1, width * height)));
}

function pdfSize(page: PageModel) {
  return { width: page.width / page.scale, height: page.height / page.scale };
}

function cloneObject(object: StudioObject): StudioObject {
  if (object.kind === "pen") return { ...object, points: object.points.map((point) => ({ ...point })) };
  return { ...object } as StudioObject;
}

function cloneSnapshot(pages: PageModel[], objects: StudioObject[], currentPage: number): Snapshot {
  return { pages: pages.map((page) => ({ ...page })), objects: objects.map(cloneObject), currentPage };
}

function pushLimited<T>(list: T[], value: T) {
  return [...list.slice(Math.max(0, list.length - HISTORY_LIMIT + 1)), value];
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r: 0.08, g: 0.1, b: 0.16 };
  return {
    r: Number.parseInt(value.slice(0, 2), 16) / 255,
    g: Number.parseInt(value.slice(2, 4), 16) / 255,
    b: Number.parseInt(value.slice(4, 6), 16) / 255,
  };
}

function blankPreview(width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}"><rect width="100%" height="100%" fill="#fff"/><rect x="1" y="1" width="${Math.max(0, Math.ceil(width) - 2)}" height="${Math.max(0, Math.ceil(height) - 2)}" fill="none" stroke="#eef0f3" stroke-width="2"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function dataUrlBytes(dataUrl: string) {
  return fetch(dataUrl).then((response) => response.arrayBuffer());
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function objectStyle(object: StudioObject, page: PageModel, zoom: number) {
  const size = pdfSize(page);
  const scale = page.scale * zoom;
  return {
    left: object.x * scale,
    top: (size.height - object.y - object.height) * scale,
    width: object.width * scale,
    height: object.height * scale,
    opacity: object.opacity,
    zIndex: object.z,
    transform: `rotate(${-object.rotation}deg)`,
  };
}

function normalizePen(points: Point[]) {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = Math.max(MIN_SIZE, maxX - minX);
  const height = Math.max(MIN_SIZE, maxY - minY);
  return {
    x: minX,
    y: minY,
    width,
    height,
    points: points.map((point) => ({ x: (point.x - minX) / width, y: (point.y - minY) / height })),
  };
}

function replaceInsensitive(source: string, search: string, replacement: string) {
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(escaped, "gi"), replacement);
}

function isTextObject(object: StudioObject): object is TextObject {
  return object.kind === "text" || object.kind === "comment" || object.kind === "stamp" || object.kind === "replacement";
}

function isResizable(object: StudioObject) {
  return object.kind !== "pen";
}

function labelFor(object: StudioObject) {
  const names: Record<StudioObject["kind"], string> = {
    text: "Texto",
    comment: "Comentário",
    stamp: "Carimbo",
    replacement: "Texto substituído",
    highlight: "Destaque",
    redact: "Redação segura",
    rect: "Retângulo",
    ellipse: "Círculo",
    line: "Linha",
    arrow: "Seta",
    pen: "Desenho livre",
    image: "Imagem",
    signature: "Assinatura",
  };
  return names[object.kind];
}

async function renderSanitizedPage(document: PdfJsDocument, sourceIndex: number, sanitizers: StudioObject[]) {
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
    for (const object of sanitizers) {
      const x = Math.floor(object.x * scale) - 2;
      const y = Math.floor(canvas.height - (object.y + object.height) * scale) - 2;
      const width = Math.ceil(object.width * scale) + 4;
      const height = Math.ceil(object.height * scale) + 4;
      context.fillStyle = object.kind === "redact" ? "#000" : "#fff";
      context.fillRect(x, y, width, height);
    }
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.95);
    const bytes = await blob.arrayBuffer();
    canvas.width = 1;
    canvas.height = 1;
    return { bytes, width: base.width, height: base.height };
  } finally {
    sourcePage.cleanup();
  }
}

export function PdfEditorStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const drawingRef = useRef<DrawingState | null>(null);
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
  const [zoom, setZoom] = useState(0.9);
  const [showGrid, setShowGrid] = useState(false);
  const [snap, setSnap] = useState(true);
  const [guideX, setGuideX] = useState<number | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "exporting" | "error">("idle");
  const [message, setMessage] = useState("Editor Studio pronto.");
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [stampText, setStampText] = useState("APROVADO");
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  const page = pages[currentPage] || null;
  const selected = objects.find((object) => object.id === selectedId) || null;
  const pageObjects = useMemo(() => page ? objects.filter((object) => object.pageId === page.id && !object.hidden).sort((a, b) => a.z - b.z) : [], [objects, page]);
  const pageLayers = useMemo(() => page ? objects.filter((object) => object.pageId === page.id).sort((a, b) => b.z - a.z) : [], [objects, page]);

  const cleanupUrls = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
  }, []);

  useEffect(() => () => cleanupUrls(), [cleanupUrls]);

  const snapshot = useCallback(() => cloneSnapshot(pages, objects, currentPage), [currentPage, objects, pages]);
  const pushHistory = useCallback((value = snapshot()) => {
    setUndoStack((current) => pushLimited(current, value));
    setRedoStack([]);
  }, [snapshot]);

  const restoreSnapshot = useCallback((value: Snapshot) => {
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
      restoreSnapshot(previous);
      return current.slice(0, -1);
    });
  }, [restoreSnapshot, snapshot]);

  const redo = useCallback(() => {
    setRedoStack((current) => {
      const next = current.at(-1);
      if (!next) return current;
      setUndoStack((undoHistory) => pushLimited(undoHistory, snapshot()));
      restoreSnapshot(next);
      return current.slice(0, -1);
    });
  }, [restoreSnapshot, snapshot]);

  const nextZ = useCallback(() => Math.max(0, ...objects.map((object) => object.z)) + 1, [objects]);

  const openFile = useCallback((selected: File) => {
    if (selected.type !== "application/pdf") return setMessage("Selecione um arquivo PDF.");
    if (selected.size > MAX_FILE_SIZE) return setMessage("O PDF ultrapassa o limite recomendado de 60 MB.");
    cleanupUrls();
    setFiles([selected]);
  }, [cleanupUrls, setFiles]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    void (async () => {
      setStatus("loading");
      setMessage("Criando miniaturas, texto pesquisável e área de edição...");
      try {
        const bytes = await file.arrayBuffer();
        const document = await loadPdfJsDocument(bytes.slice(0));
        const nextPages: PageModel[] = [];
        const nextDetected: DetectedText[] = [];
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
              const preview = await canvasToBlob(canvas, "image/jpeg", 0.82);
              const url = URL.createObjectURL(preview);
              urlsRef.current.push(url);
              nextPages.push({ id: `src:${pageNumber - 1}`, sourceIndex: pageNumber - 1, width: canvas.width, height: canvas.height, scale, previewUrl: url });
              const textContent = await sourcePage.getTextContent();
              for (const item of textContent.items as Array<{ str?: string; width?: number; height?: number; transform?: number[] }>) {
                if (!item.str?.trim() || !Array.isArray(item.transform)) continue;
                const fontSize = Math.max(7, Math.hypot(item.transform[0] || 0, item.transform[1] || 0));
                nextDetected.push({
                  sourceIndex: pageNumber - 1,
                  text: item.str,
                  x: Math.max(0, (item.transform[4] || 0) - 1),
                  y: Math.max(0, (item.transform[5] || 0) - fontSize * 0.22),
                  width: Math.max(item.width || fontSize, fontSize * 0.7),
                  height: Math.max(item.height || fontSize * 1.2, fontSize * 1.15),
                  fontSize,
                });
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
        setDetectedText(nextDetected);
        setObjects([]);
        setCurrentPage(0);
        setSelectedId(null);
        setUndoStack([]);
        setRedoStack([]);
        setStatus("ready");
        setMessage(restored ? "Sessão recuperada. O Studio está pronto." : "PDF pronto. Escolha uma ferramenta e clique na página.");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Não foi possível abrir este PDF. Verifique se ele está protegido ou corrompido.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [file, restored]);

  function pagePoint(event: React.PointerEvent<HTMLElement>): Point | null {
    if (!page || !stageRef.current) return null;
    const rect = stageRef.current.getBoundingClientRect();
    const size = pdfSize(page);
    const scale = page.scale * zoom;
    return {
      x: Math.max(0, Math.min(size.width, (event.clientX - rect.left) / scale)),
      y: Math.max(0, Math.min(size.height, size.height - (event.clientY - rect.top) / scale)),
    };
  }

  function addTextAt(point: Point, kind: "text" | "comment" | "stamp" = "text") {
    if (!page) return;
    pushHistory();
    const id = crypto.randomUUID();
    const text = kind === "comment" ? "Comentário" : kind === "stamp" ? stampText : "Novo texto";
    const object: TextObject = {
      id, pageId: page.id, kind, text,
      x: point.x, y: point.y - (kind === "comment" ? 56 : 22), width: kind === "comment" ? 180 : kind === "stamp" ? 150 : 170, height: kind === "comment" ? 64 : 30,
      z: nextZ(), rotation: 0, opacity: 1,
      fontSize: kind === "stamp" ? 19 : kind === "comment" ? 10 : 18,
      fontFamily: "Helvetica", bold: kind === "stamp", italic: false,
      color: kind === "stamp" ? "#d40d18" : "#111827", align: "left",
    };
    setObjects((current) => [...current, object]);
    setSelectedId(id);
    setTool("select");
  }

  function beginStagePointer(event: React.PointerEvent<HTMLDivElement>) {
    if (!page || status !== "ready") return;
    const point = pagePoint(event);
    if (!point) return;
    if (tool === "select") {
      if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains("studio-page-image")) setSelectedId(null);
      return;
    }
    if (tool === "text") return addTextAt(point, "text");
    if (tool === "comment") return addTextAt(point, "comment");
    if (tool === "stamp") return addTextAt(point, "stamp");
    if (tool === "signature") {
      if (!signatureDataUrl) return setMessage("Desenhe sua assinatura no painel direito antes de inserir.");
      pushHistory();
      const id = crypto.randomUUID();
      const object: ImageObject = { id, pageId: page.id, kind: "signature", dataUrl: signatureDataUrl, mime: "image/png", x: point.x, y: point.y - 55, width: 170, height: 55, z: nextZ(), rotation: 0, opacity: 1 };
      setObjects((current) => [...current, object]);
      setSelectedId(id);
      setTool("select");
      return;
    }
    if (["highlight", "redact", "pen", "line", "arrow", "rect", "ellipse"].includes(tool)) {
      const id = crypto.randomUUID();
      drawingRef.current = { id, tool: tool as DrawingState["tool"], pointerId: event.pointerId, start: point, rawPoints: [point] };
      event.currentTarget.setPointerCapture(event.pointerId);
      pushHistory();
      if (tool === "pen") {
        const object: PenObject = { id, pageId: page.id, kind: "pen", x: point.x, y: point.y, width: MIN_SIZE, height: MIN_SIZE, z: nextZ(), rotation: 0, opacity: 1, stroke: "#1d2430", strokeWidth: 2.2, points: [{ x: .5, y: .5 }] };
        setObjects((current) => [...current, object]);
      } else if (tool === "line" || tool === "arrow") {
        const object: LineObject = { id, pageId: page.id, kind: tool, x: point.x, y: point.y, width: MIN_SIZE, height: MIN_SIZE, z: nextZ(), rotation: 0, opacity: 1, stroke: "#e10f19", strokeWidth: 2.2, flipY: false };
        setObjects((current) => [...current, object]);
      } else {
        const object: AreaObject = { id, pageId: page.id, kind: tool, x: point.x, y: point.y, width: MIN_SIZE, height: MIN_SIZE, z: nextZ(), rotation: 0, opacity: tool === "highlight" ? .4 : 1, fill: tool === "highlight" ? "#ffe15a" : tool === "redact" ? "#000000" : "#ffffff", stroke: tool === "rect" || tool === "ellipse" ? "#e10f19" : tool === "redact" ? "#000000" : "#f1b600", strokeWidth: 2 };
        setObjects((current) => [...current, object]);
      }
      setSelectedId(id);
    }
  }

  function moveStagePointer(event: React.PointerEvent<HTMLDivElement>) {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    const point = pagePoint(event);
    if (!point) return;
    if (drawing.tool === "pen") {
      drawing.rawPoints.push(point);
      const normalized = normalizePen(drawing.rawPoints);
      setObjects((current) => current.map((object) => object.id === drawing.id && object.kind === "pen" ? { ...object, ...normalized } : object));
      return;
    }
    const minX = Math.min(drawing.start.x, point.x);
    const maxX = Math.max(drawing.start.x, point.x);
    const minY = Math.min(drawing.start.y, point.y);
    const maxY = Math.max(drawing.start.y, point.y);
    setObjects((current) => current.map((object) => object.id === drawing.id ? {
      ...object,
      x: minX,
      y: minY,
      width: Math.max(MIN_SIZE, maxX - minX),
      height: Math.max(MIN_SIZE, maxY - minY),
      ...(object.kind === "line" || object.kind === "arrow" ? { flipY: point.y < drawing.start.y } : {}),
    } as StudioObject : object));
  }

  function endStagePointer(event: React.PointerEvent<HTMLDivElement>) {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    drawingRef.current = null;
    setTool("select");
    setMessage("Elemento criado. Ajuste posição, estilo e propriedades no painel direito.");
  }

  function snapPosition(object: StudioObject, x: number, y: number) {
    if (!page || !snap) return { x, y };
    const size = pdfSize(page);
    let nextX = Math.round(x / 5) * 5;
    let nextY = Math.round(y / 5) * 5;
    const centerX = nextX + object.width / 2;
    const centerY = nextY + object.height / 2;
    const threshold = 6;
    if (Math.abs(centerX - size.width / 2) < threshold) {
      nextX = size.width / 2 - object.width / 2;
      setGuideX(size.width / 2);
    } else setGuideX(null);
    if (Math.abs(centerY - size.height / 2) < threshold) {
      nextY = size.height / 2 - object.height / 2;
      setGuideY(size.height / 2);
    } else setGuideY(null);
    return { x: Math.max(0, Math.min(size.width - object.width, nextX)), y: Math.max(0, Math.min(size.height - object.height, nextY)) };
  }

  function beginObjectDrag(event: React.PointerEvent<HTMLButtonElement>, object: StudioObject, mode: "move" | "resize") {
    if (!page) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(object.id);
    if (object.locked) return setMessage("Camada bloqueada. Desbloqueie para editar.");
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode, id: object.id, pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, start: cloneObject(object), snapshot: snapshot() };
  }

  function moveObjectDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !page) return;
    event.preventDefault();
    const scale = page.scale * zoom;
    const dx = (event.clientX - drag.startClientX) / scale;
    const dy = (event.clientY - drag.startClientY) / scale;
    setObjects((current) => current.map((object) => {
      if (object.id !== drag.id) return object;
      if (drag.mode === "move") {
        const positioned = snapPosition(drag.start, drag.start.x + dx, drag.start.y - dy);
        return { ...object, ...positioned } as StudioObject;
      }
      const width = Math.max(MIN_SIZE, drag.start.width + dx);
      const height = Math.max(MIN_SIZE, drag.start.height + dy);
      return { ...object, width, height, y: drag.start.y - (height - drag.start.height) } as StudioObject;
    }));
  }

  function endObjectDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setUndoStack((current) => pushLimited(current, drag.snapshot));
    setRedoStack([]);
    dragRef.current = null;
    setGuideX(null);
    setGuideY(null);
  }

  async function addImage(file: File) {
    if (!page) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) return setMessage("Use uma imagem PNG ou JPG.");
    if (file.size > MAX_IMAGE_SIZE) return setMessage("A imagem ultrapassa 8 MB.");
    try {
      const dataUrl = await fileToDataUrl(file);
      pushHistory();
      const id = crypto.randomUUID();
      const object: ImageObject = { id, pageId: page.id, kind: "image", dataUrl, mime: file.type as ImageObject["mime"], x: 55, y: 65, width: 190, height: 130, z: nextZ(), rotation: 0, opacity: 1 };
      setObjects((current) => [...current, object]);
      setSelectedId(id);
      setTool("select");
    } catch {
      setMessage("Não foi possível carregar essa imagem.");
    }
  }

  function updateSelected(patch: Partial<StudioObject>) {
    if (!selected) return;
    pushHistory();
    setObjects((current) => current.map((object) => object.id === selected.id ? { ...object, ...patch } as StudioObject : object));
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
    copy.locked = false;
    copy.hidden = false;
    copy.z = nextZ();
    setObjects((current) => [...current, copy]);
    setSelectedId(copy.id);
  }

  function movePage(direction: -1 | 1) {
    const target = currentPage + direction;
    if (target < 0 || target >= pages.length) return;
    pushHistory();
    setPages((current) => {
      const next = [...current];
      [next[currentPage], next[target]] = [next[target], next[currentPage]];
      return next;
    });
    setCurrentPage(target);
  }

  function duplicatePage() {
    if (!page) return;
    pushHistory();
    const nextPage = { ...page, id: `copy:${crypto.randomUUID()}` };
    const copiedObjects = objects.filter((object) => object.pageId === page.id).map((object) => ({ ...cloneObject(object), id: crypto.randomUUID(), pageId: nextPage.id, z: nextZ() } as StudioObject));
    setPages((current) => [...current.slice(0, currentPage + 1), nextPage, ...current.slice(currentPage + 1)]);
    setObjects((current) => [...current, ...copiedObjects]);
    setCurrentPage(currentPage + 1);
    setSelectedId(null);
  }

  function insertBlankPage() {
    if (!page) return;
    pushHistory();
    const item: PageModel = { ...page, id: `blank:${crypto.randomUUID()}`, sourceIndex: null, previewUrl: blankPreview(page.width, page.height), blank: true };
    setPages((current) => [...current.slice(0, currentPage + 1), item, ...current.slice(currentPage + 1)]);
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

  function replaceAllDetected() {
    const query = searchText.trim();
    if (!query) return setMessage("Digite o texto que deseja localizar.");
    const matches = detectedText.filter((item) => item.text.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
    if (!matches.length) return setMessage("Nenhuma ocorrência foi encontrada na camada de texto do PDF.");
    pushHistory();
    let z = nextZ();
    const replacements: TextObject[] = [];
    for (const match of matches) {
      for (const targetPage of pages.filter((item) => item.sourceIndex === match.sourceIndex)) {
        replacements.push({
          id: crypto.randomUUID(), pageId: targetPage.id, kind: "replacement", originalText: match.text, text: replaceInsensitive(match.text, query, replaceText),
          x: match.x, y: match.y, width: Math.max(match.width, 28), height: Math.max(match.height, 12), z: z++, rotation: 0, opacity: 1,
          fontSize: match.fontSize, fontFamily: "Helvetica", bold: false, italic: false, color: "#111827", align: "left",
        });
      }
    }
    setObjects((current) => [...current, ...replacements]);
    setMessage(`${replacements.length} substituição(ões) preparada(s). O conteúdo anterior será sanitizado na exportação.`);
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) { event.preventDefault(); undo(); return; }
      if ((mod && event.key.toLowerCase() === "y") || (mod && event.shiftKey && event.key.toLowerCase() === "z")) { event.preventDefault(); redo(); return; }
      if (typing) return;
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelected(); return; }
      if (mod && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateSelected(); return; }
      if (event.key === "Escape") { setTool("select"); setSelectedId(null); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  async function exportPdf() {
    if (!file || !pages.length) return;
    setStatus("exporting");
    setMessage("Aplicando camadas, desenhos e sanitização segura...");
    let sanitizeDocument: PdfJsDocument | null = null;
    try {
      const pdfLib = await import("pdf-lib");
      const sourceBytes = await file.arrayBuffer();
      const sourcePdf = await pdfLib.PDFDocument.load(sourceBytes.slice(0));
      const output = await pdfLib.PDFDocument.create();
      const fonts = new Map<string, Awaited<ReturnType<typeof output.embedFont>>>();
      const getFont = async (object: TextObject) => {
        let name = pdfLib.StandardFonts.Helvetica;
        if (object.fontFamily === "Helvetica") name = object.bold && object.italic ? pdfLib.StandardFonts.HelveticaBoldOblique : object.bold ? pdfLib.StandardFonts.HelveticaBold : object.italic ? pdfLib.StandardFonts.HelveticaOblique : pdfLib.StandardFonts.Helvetica;
        if (object.fontFamily === "Times") name = object.bold && object.italic ? pdfLib.StandardFonts.TimesRomanBoldItalic : object.bold ? pdfLib.StandardFonts.TimesRomanBold : object.italic ? pdfLib.StandardFonts.TimesRomanItalic : pdfLib.StandardFonts.TimesRoman;
        if (object.fontFamily === "Courier") name = object.bold && object.italic ? pdfLib.StandardFonts.CourierBoldOblique : object.bold ? pdfLib.StandardFonts.CourierBold : object.italic ? pdfLib.StandardFonts.CourierOblique : pdfLib.StandardFonts.Courier;
        if (!fonts.has(name)) fonts.set(name, await output.embedFont(name));
        return fonts.get(name)!;
      };
      const needsSanitization = objects.some((object) => object.kind === "redact" || object.kind === "replacement");
      if (needsSanitization) sanitizeDocument = await loadPdfJsDocument(sourceBytes.slice(0));

      for (const item of pages) {
        const visible = objects.filter((object) => object.pageId === item.id && !object.hidden).sort((a, b) => a.z - b.z);
        const sanitizers = visible.filter((object) => object.kind === "redact" || object.kind === "replacement");
        let targetPage;
        if (item.sourceIndex === null) {
          const size = pdfSize(item);
          targetPage = output.addPage([size.width, size.height]);
        } else if (sanitizers.length && sanitizeDocument) {
          const sanitized = await renderSanitizedPage(sanitizeDocument, item.sourceIndex, sanitizers);
          targetPage = output.addPage([sanitized.width, sanitized.height]);
          const baseImage = await output.embedJpg(sanitized.bytes);
          targetPage.drawImage(baseImage, { x: 0, y: 0, width: sanitized.width, height: sanitized.height });
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
            const fill = hexToRgb(object.fill);
            targetPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, color: pdfLib.rgb(fill.r, fill.g, fill.b), opacity: Math.min(.7, object.opacity) });
            continue;
          }
          if (object.kind === "rect") {
            const stroke = hexToRgb(object.stroke);
            targetPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, borderColor: pdfLib.rgb(stroke.r, stroke.g, stroke.b), borderWidth: object.strokeWidth, opacity: object.opacity, rotate: pdfLib.degrees(object.rotation) });
            continue;
          }
          if (object.kind === "ellipse") {
            const stroke = hexToRgb(object.stroke);
            targetPage.drawEllipse({ x: object.x + object.width / 2, y: object.y + object.height / 2, xScale: object.width / 2, yScale: object.height / 2, borderColor: pdfLib.rgb(stroke.r, stroke.g, stroke.b), borderWidth: object.strokeWidth, opacity: object.opacity });
            continue;
          }
          if (object.kind === "line" || object.kind === "arrow") {
            const stroke = hexToRgb(object.stroke);
            const start = object.flipY ? { x: object.x, y: object.y + object.height } : { x: object.x, y: object.y };
            const end = object.flipY ? { x: object.x + object.width, y: object.y } : { x: object.x + object.width, y: object.y + object.height };
            targetPage.drawLine({ start, end, thickness: object.strokeWidth, color: pdfLib.rgb(stroke.r, stroke.g, stroke.b), opacity: object.opacity });
            if (object.kind === "arrow") {
              const angle = Math.atan2(end.y - start.y, end.x - start.x);
              const head = Math.max(8, object.strokeWidth * 4.5);
              const left = { x: end.x - head * Math.cos(angle - Math.PI / 6), y: end.y - head * Math.sin(angle - Math.PI / 6) };
              const right = { x: end.x - head * Math.cos(angle + Math.PI / 6), y: end.y - head * Math.sin(angle + Math.PI / 6) };
              targetPage.drawLine({ start: end, end: left, thickness: object.strokeWidth, color: pdfLib.rgb(stroke.r, stroke.g, stroke.b), opacity: object.opacity });
              targetPage.drawLine({ start: end, end: right, thickness: object.strokeWidth, color: pdfLib.rgb(stroke.r, stroke.g, stroke.b), opacity: object.opacity });
            }
            continue;
          }
          if (object.kind === "pen") {
            const stroke = hexToRgb(object.stroke);
            for (let index = 1; index < object.points.length; index += 1) {
              const previous = object.points[index - 1];
              const current = object.points[index];
              targetPage.drawLine({
                start: { x: object.x + previous.x * object.width, y: object.y + previous.y * object.height },
                end: { x: object.x + current.x * object.width, y: object.y + current.y * object.height },
                thickness: object.strokeWidth,
                color: pdfLib.rgb(stroke.r, stroke.g, stroke.b),
                opacity: object.opacity,
              });
            }
            continue;
          }
          if (object.kind === "image" || object.kind === "signature") {
            const bytes = await dataUrlBytes(object.dataUrl);
            const image = object.mime === "image/jpeg" ? await output.embedJpg(bytes) : await output.embedPng(bytes);
            targetPage.drawImage(image, { x: object.x, y: object.y, width: object.width, height: object.height, opacity: object.opacity, rotate: pdfLib.degrees(object.rotation) });
            continue;
          }
          const font = await getFont(object);
          const color = hexToRgb(object.color);
          if (object.kind === "comment") {
            targetPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, color: pdfLib.rgb(1, .96, .72), borderColor: pdfLib.rgb(.92, .64, .12), borderWidth: 1, opacity: object.opacity });
          }
          if (object.kind === "stamp") {
            targetPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, borderColor: pdfLib.rgb(.84, .05, .09), borderWidth: 2.2, opacity: object.opacity });
          }
          if (!object.text.trim()) continue;
          targetPage.drawText(object.text, {
            x: object.x + (object.kind === "comment" ? 6 : 0),
            y: object.y + (object.kind === "comment" ? object.height - object.fontSize - 6 : Math.max(1, object.height * .18)),
            size: Math.max(6, Math.min(120, object.fontSize)),
            font,
            color: pdfLib.rgb(color.r, color.g, color.b),
            maxWidth: Math.max(20, object.width - (object.kind === "comment" ? 12 : 0)),
            opacity: object.opacity,
            rotate: pdfLib.degrees(object.rotation),
          });
        }
      }

      const bytes = await output.save({ useObjectStreams: true });
      downloadBytes(bytes, `${file.name.replace(/\.pdf$/i, "")}-studio-lim-pdf.pdf`);
      setStatus("ready");
      setMessage(needsSanitization ? "PDF exportado. Redações e textos substituídos foram sanitizados antes das novas camadas." : "PDF exportado com as novas camadas do Studio.");
    } catch {
      setStatus("error");
      setMessage("Não foi possível exportar este PDF. Tente remover a última camada ou usar o modo de compatibilidade.");
    } finally {
      if (sanitizeDocument) {
        try { await sanitizeDocument.cleanup(); } catch { /* no-op */ }
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
    return <section className="studio-upload-card">
      <span className="studio-upload-icon"><UploadCloud size={32} /></span>
      <span className="studio-kicker"><Sparkles size={14} /> Studio 2.0</span>
      <h2>Edite o PDF como em um aplicativo</h2>
      <p>Texto, desenho livre, formas, setas, destaque, redação segura, comentários, carimbos, imagens e assinatura — tudo no navegador.</p>
      <button className="primary-button large-button" type="button" onClick={() => inputRef.current?.click()}><FileText size={18} /> Abrir PDF</button>
      <input ref={inputRef} hidden type="file" accept="application/pdf" onChange={(event) => event.target.files?.[0] && openFile(event.target.files[0])} />
      <div className="studio-upload-features"><span><ShieldCheck size={15} /> Processamento local</span><span><PencilLine size={15} /> Edição visual</span><span><Grid2X2 size={15} /> Guias inteligentes</span></div>
    </section>;
  }

  return <section className="studio-shell">
    <header className="studio-topbar">
      <div className="studio-file"><FileText size={18} /><span><strong>{file.name}</strong><small>{cached ? "Arquivo temporário protegido neste navegador" : "Sessão local"}{restored ? " · recuperada" : ""}</small></span></div>
      <div className="studio-history"><button type="button" onClick={undo} disabled={!undoStack.length} title="Desfazer"><Undo2 size={16} /></button><button type="button" onClick={redo} disabled={!redoStack.length} title="Refazer"><Redo2 size={16} /></button></div>
      <div className="studio-view-controls"><button type="button" className={showGrid ? "active" : ""} onClick={() => setShowGrid((value) => !value)}><Grid2X2 size={15} /> Grade</button><button type="button" className={snap ? "active" : ""} onClick={() => setSnap((value) => !value)}><SlidersHorizontal size={15} /> Snap</button><div><button type="button" onClick={() => setZoom((value) => Math.max(.5, Number((value - .1).toFixed(2))))}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.7, Number((value + .1).toFixed(2))))}>+</button></div></div>
      <div className="studio-top-actions"><button className="secondary-button" type="button" onClick={closeDocument}>Fechar</button><button className="primary-button" type="button" onClick={exportPdf} disabled={status === "loading" || status === "exporting"}>{status === "exporting" ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />} Baixar PDF</button></div>
    </header>

    <div className="studio-body">
      <aside className="studio-tools" aria-label="Ferramentas do Studio">
        {([
          ["select", "Selecionar", MousePointer2], ["text", "Texto", Type], ["pen", "Caneta", PencilLine], ["highlight", "Destacar", PencilLine], ["line", "Linha", ArrowRight], ["arrow", "Seta", ArrowRight], ["rect", "Retângulo", Grid2X2], ["ellipse", "Círculo", CircleOff], ["redact", "Redigir", ShieldCheck], ["comment", "Comentário", FileText], ["stamp", "Carimbo", CheckCircle2], ["signature", "Assinar", Signature],
        ] as const).map(([id, label, Icon]) => <button key={id} type="button" className={tool === id ? "active" : ""} onClick={() => setTool(id)} title={label}><Icon size={19} /><span>{label}</span></button>)}
        <button type="button" onClick={() => imageInputRef.current?.click()} title="Imagem"><ImagePlus size={19} /><span>Imagem</span></button>
        <input ref={imageInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => event.target.files?.[0] && void addImage(event.target.files[0])} />
      </aside>

      <aside className="studio-pages">
        <div className="studio-pages-heading"><strong>Páginas</strong><span>{pages.length}</span></div>
        <div className="studio-page-actions"><button type="button" onClick={() => movePage(-1)} disabled={currentPage === 0}><ArrowUp size={13} /></button><button type="button" onClick={() => movePage(1)} disabled={currentPage === pages.length - 1}><ArrowDown size={13} /></button><button type="button" onClick={duplicatePage}>Duplicar</button><button type="button" onClick={insertBlankPage}>Em branco</button><button type="button" onClick={deletePage} disabled={pages.length <= 1}>Excluir</button></div>
        <div className="studio-page-list">{pages.map((item, index) => <button type="button" key={item.id} className={index === currentPage ? "active" : ""} onClick={() => { setCurrentPage(index); setSelectedId(null); }}><img src={item.previewUrl} alt={`Página ${index + 1}`} /><span>{index + 1}</span>{item.blank ? <small>em branco</small> : null}</button>)}</div>
      </aside>

      <main className={`studio-canvas-wrap ${showGrid ? "show-grid" : ""}`}>
        {status === "loading" ? <div className="studio-loading"><LoaderCircle className="spin" size={26} /><strong>Preparando Studio</strong><p>{message}</p></div> : null}
        {page ? <div className="studio-stage" ref={stageRef} style={{ width: page.width * zoom, height: page.height * zoom }} onPointerDown={beginStagePointer} onPointerMove={moveStagePointer} onPointerUp={endStagePointer} onPointerCancel={endStagePointer}>
          <img className="studio-page-image" src={page.previewUrl} alt={`Página ${currentPage + 1}`} draggable={false} />
          {guideX !== null ? <span className="studio-guide vertical" style={{ left: guideX * page.scale * zoom }} /> : null}
          {guideY !== null ? <span className="studio-guide horizontal" style={{ bottom: guideY * page.scale * zoom }} /> : null}
          {pageObjects.map((object) => <button key={object.id} type="button" className={`studio-object kind-${object.kind} ${selectedId === object.id ? "selected" : ""} ${object.locked ? "locked" : ""}`} style={objectStyle(object, page, zoom)} title={labelFor(object)} onPointerDown={(event) => beginObjectDrag(event, object, "move")} onPointerMove={moveObjectDrag} onPointerUp={endObjectDrag} onPointerCancel={endObjectDrag}>
            {isTextObject(object) ? <span className={`studio-text align-${object.align}`} style={{ color: object.color, fontSize: object.fontSize * page.scale * zoom, fontFamily: object.fontFamily === "Times" ? "Georgia,serif" : object.fontFamily === "Courier" ? "monospace" : "Arial,sans-serif", fontWeight: object.bold ? 800 : 400, fontStyle: object.italic ? "italic" : "normal" }}>{object.text}</span> : null}
            {object.kind === "highlight" ? <span className="studio-area" style={{ background: object.fill }} /> : null}
            {object.kind === "redact" ? <span className="studio-area studio-redaction">REDACTED</span> : null}
            {object.kind === "rect" ? <span className="studio-shape-rect" style={{ borderColor: object.stroke, borderWidth: object.strokeWidth }} /> : null}
            {object.kind === "ellipse" ? <span className="studio-shape-ellipse" style={{ borderColor: object.stroke, borderWidth: object.strokeWidth }} /> : null}
            {object.kind === "line" || object.kind === "arrow" ? <svg className="studio-line" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1={object.flipY ? 0 : 100} x2="100" y2={object.flipY ? 100 : 0} stroke={object.stroke} strokeWidth={Math.max(1, object.strokeWidth * 2)} vectorEffect="non-scaling-stroke" />{object.kind === "arrow" ? <polyline points={object.flipY ? "84,78 100,100 78,84" : "80,16 100,0 84,22"} fill="none" stroke={object.stroke} strokeWidth={Math.max(1, object.strokeWidth * 2)} vectorEffect="non-scaling-stroke" /> : null}</svg> : null}
            {object.kind === "pen" ? <svg className="studio-pen" viewBox={`0 0 ${Math.max(1, object.width)} ${Math.max(1, object.height)}`} preserveAspectRatio="none"><polyline points={object.points.map((point) => `${point.x * object.width},${(1 - point.y) * object.height}`).join(" ")} fill="none" stroke={object.stroke} strokeWidth={object.strokeWidth} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
            {object.kind === "image" || object.kind === "signature" ? <img src={object.dataUrl} alt={labelFor(object)} draggable={false} /> : null}
            {selectedId === object.id && !object.locked && isResizable(object) ? <span className="studio-resize-handle" onPointerDown={(event) => beginObjectDrag(event as unknown as React.PointerEvent<HTMLButtonElement>, object, "resize")} /> : null}
          </button>)}
        </div> : null}
        <div className="studio-canvas-status"><span>{tool === "select" ? "Selecione um elemento para editar" : `Ferramenta: ${tool}. Clique e arraste na página.`}</span><span>Página {currentPage + 1} de {pages.length}</span></div>
      </main>

      <aside className="studio-properties">
        <div className="studio-properties-head"><strong>Propriedades</strong>{selected ? <button type="button" onClick={deleteSelected}><Trash2 size={14} /> Excluir</button> : null}</div>
        {selected ? <div className="studio-properties-content">
          <div className="studio-object-summary"><span>{labelFor(selected)}</span><div><button type="button" onClick={duplicateSelected}><CopyPlus size={14} /> Duplicar</button><button type="button" onClick={() => updateSelected({ locked: !selected.locked } as Partial<StudioObject>)}><LockKeyhole size={14} /> {selected.locked ? "Desbloquear" : "Bloquear"}</button><button type="button" onClick={() => updateSelected({ hidden: !selected.hidden } as Partial<StudioObject>)}><CircleOff size={14} /> {selected.hidden ? "Mostrar" : "Ocultar"}</button></div></div>
          {isTextObject(selected) ? <>
            <label><span>Conteúdo</span><textarea value={selected.text} disabled={selected.locked} onChange={(event) => setObjects((current) => current.map((object) => object.id === selected.id ? { ...object, text: event.target.value } as StudioObject : object))} /></label>
            <div className="studio-two-cols"><label><span>Fonte</span><select value={selected.fontFamily} disabled={selected.locked} onChange={(event) => updateSelected({ fontFamily: event.target.value as FontFamily } as Partial<StudioObject>)}><option>Helvetica</option><option>Times</option><option>Courier</option></select></label><label><span>Tamanho</span><input type="number" min="6" max="120" value={selected.fontSize} disabled={selected.locked} onChange={(event) => updateSelected({ fontSize: Number(event.target.value) || 12 } as Partial<StudioObject>)} /></label></div>
            <div className="studio-format-row"><button type="button" className={selected.bold ? "active" : ""} onClick={() => updateSelected({ bold: !selected.bold } as Partial<StudioObject>)}>B</button><button type="button" className={selected.italic ? "active" : ""} onClick={() => updateSelected({ italic: !selected.italic } as Partial<StudioObject>)}><em>I</em></button><button type="button" className={selected.align === "left" ? "active" : ""} onClick={() => updateSelected({ align: "left" } as Partial<StudioObject>)}>Esq.</button><button type="button" className={selected.align === "center" ? "active" : ""} onClick={() => updateSelected({ align: "center" } as Partial<StudioObject>)}>Centro</button><button type="button" className={selected.align === "right" ? "active" : ""} onClick={() => updateSelected({ align: "right" } as Partial<StudioObject>)}>Dir.</button></div>
            <label><span>Cor do texto</span><input type="color" value={selected.color} disabled={selected.locked} onChange={(event) => updateSelected({ color: event.target.value } as Partial<StudioObject>)} /></label>
          </> : null}
          {(selected.kind === "rect" || selected.kind === "ellipse" || selected.kind === "line" || selected.kind === "arrow" || selected.kind === "pen") ? <div className="studio-two-cols"><label><span>Cor</span><input type="color" value={"stroke" in selected ? selected.stroke : "#e10f19"} disabled={selected.locked} onChange={(event) => updateSelected({ stroke: event.target.value } as Partial<StudioObject>)} /></label><label><span>Espessura</span><input type="number" min="1" max="16" value={"strokeWidth" in selected ? selected.strokeWidth : 2} disabled={selected.locked} onChange={(event) => updateSelected({ strokeWidth: Number(event.target.value) || 1 } as Partial<StudioObject>)} /></label></div> : null}
          {selected.kind === "highlight" ? <label><span>Cor do destaque</span><input type="color" value={selected.fill} onChange={(event) => updateSelected({ fill: event.target.value } as Partial<StudioObject>)} /></label> : null}
          <div className="studio-two-cols"><label><span>Rotação</span><input type="number" min="-180" max="180" value={selected.rotation} disabled={selected.locked} onChange={(event) => updateSelected({ rotation: Number(event.target.value) || 0 } as Partial<StudioObject>)} /></label><label><span>Opacidade</span><input type="range" min="0.1" max="1" step="0.05" value={selected.opacity} disabled={selected.locked} onChange={(event) => updateSelected({ opacity: Number(event.target.value) } as Partial<StudioObject>)} /></label></div>
          <div className="studio-position-grid"><label><span>X</span><input type="number" value={Math.round(selected.x)} onChange={(event) => updateSelected({ x: Number(event.target.value) || 0 } as Partial<StudioObject>)} /></label><label><span>Y</span><input type="number" value={Math.round(selected.y)} onChange={(event) => updateSelected({ y: Number(event.target.value) || 0 } as Partial<StudioObject>)} /></label><label><span>L</span><input type="number" min={MIN_SIZE} value={Math.round(selected.width)} onChange={(event) => updateSelected({ width: Math.max(MIN_SIZE, Number(event.target.value) || MIN_SIZE) } as Partial<StudioObject>)} /></label><label><span>A</span><input type="number" min={MIN_SIZE} value={Math.round(selected.height)} onChange={(event) => updateSelected({ height: Math.max(MIN_SIZE, Number(event.target.value) || MIN_SIZE) } as Partial<StudioObject>)} /></label></div>
        </div> : <div className="studio-empty-properties"><MousePointer2 size={26} /><strong>Nada selecionado</strong><p>Escolha uma ferramenta à esquerda ou selecione uma camada na página.</p></div>}

        <div className="studio-find-replace"><div><Search size={15} /><strong>Localizar e substituir</strong></div><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Texto atual" /><input value={replaceText} onChange={(event) => setReplaceText(event.target.value)} placeholder="Novo texto" /><button type="button" onClick={replaceAllDetected}>Substituir em todas as páginas</button><small>Funciona em PDFs com camada de texto. A área original é sanitizada na exportação.</small></div>
        <div className="studio-stamps"><strong>Carimbos</strong><select value={stampText} onChange={(event) => setStampText(event.target.value)}><option>APROVADO</option><option>ASSINADO</option><option>CONFIDENCIAL</option><option>REVISADO</option><option>URGENTE</option><option>CANCELADO</option></select><button type="button" onClick={() => setTool("stamp")}>Inserir carimbo</button></div>
        <div className="studio-signature"><strong>Assinatura</strong><SignaturePad onChange={setSignatureDataUrl} /><button type="button" disabled={!signatureDataUrl} onClick={() => setTool("signature")}>Inserir na página</button></div>
        <div className="studio-layers"><div><strong>Camadas</strong><span>{pageLayers.length}</span></div>{pageLayers.length ? pageLayers.map((object) => <button type="button" className={selectedId === object.id ? "active" : ""} key={object.id} onClick={() => setSelectedId(object.id)}><span>{labelFor(object)}</span><small>{object.locked ? "Bloqueada" : object.hidden ? "Oculta" : "Editável"}</small></button>) : <small>Nenhuma camada nesta página.</small>}</div>
      </aside>
    </div>
    <footer className={`studio-status ${status === "error" ? "error" : ""}`}><span>{status === "exporting" ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}{message}</span><span><ShieldCheck size={15} /> Processamento local e privado</span></footer>
  </section>;
}
