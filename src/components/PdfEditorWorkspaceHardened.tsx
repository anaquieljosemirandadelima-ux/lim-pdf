"use client";
/* eslint-disable @next/next/no-img-element */

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  CircleOff,
  Download,
  FileText,
  ImagePlus,
  LockKeyhole,
  LoaderCircle,
  MousePointer2,
  PencilLine,
  Redo2,
  Save,
  ShieldCheck,
  Signature,
  Trash2,
  Type,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadBytes } from "@/lib/browser-files";
import { loadEditorImageAssets, saveEditorImageAssets } from "@/lib/editor-assets";
import { cleanupExpiredEditorDrafts, EDITOR_DRAFT_PREFIX, EDITOR_RECENTS_KEY } from "@/lib/editor-drafts";
import { canvasToBlob, loadPdfJsDocument } from "@/lib/pdf-render";
import { isFileWithinLimit, isPdfFile, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";
import { useTemporaryFiles } from "@/lib/use-temporary-files";
import { useLanguage } from "@/lib/use-language";
import { SignaturePad } from "./SignaturePad";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_PREVIEW_PIXELS = 1_800_000;
const MAX_SANITIZE_PIXELS = 20_000_000;
const PREVIEW_SCALE = 1.2;
const SANITIZE_SCALE = 2.6;
const MIN_OBJECT_SIZE = 12;
const HISTORY_LIMIT = 60;

type Language = "pt-BR" | "en" | "es";

const labels: Record<Language, Record<string, string>> = {
  "pt-BR": {
    openTitle: "Abra o PDF que deseja editar",
    openDescription: "O arquivo fica temporariamente no navegador. Rascunhos e imagens expiram automaticamente em até 4 horas.",
    selectPdf: "Selecionar PDF",
    noUpload: "Sem upload para o LIM PDF",
    recentDrafts: "Rascunhos recentes",
    select: "Selecionar",
    addText: "Adicionar texto",
    highlight: "Destacar",
    redact: "Redigir",
    comment: "Comentário",
    signature: "Assinatura",
    addImage: "Adicionar imagem",
    pages: "Páginas",
    properties: "Propriedades",
    delete: "Excluir",
    copy: "Copiar",
    duplicate: "Duplicar",
    paste: "Colar",
    content: "Conteúdo",
    fontSize: "Tamanho da fonte",
    layers: "Camadas da página",
    noLayers: "Nenhuma camada adicionada nesta página.",
    insertSignature: "Inserir assinatura",
    cache: "Processamento local. Páginas com redação ou texto substituído são achatadas e sanitizadas antes da exportação.",
  },
  en: {
    openTitle: "Open the PDF you want to edit",
    openDescription: "The file stays temporarily in your browser. Drafts and images expire automatically within 4 hours.",
    selectPdf: "Select PDF",
    noUpload: "No upload to LIM PDF",
    recentDrafts: "Recent drafts",
    select: "Select",
    addText: "Add text",
    highlight: "Highlight",
    redact: "Redact",
    comment: "Comment",
    signature: "Signature",
    addImage: "Add image",
    pages: "Pages",
    properties: "Properties",
    delete: "Delete",
    copy: "Copy",
    duplicate: "Duplicate",
    paste: "Paste",
    content: "Content",
    fontSize: "Font size",
    layers: "Page layers",
    noLayers: "No layer added to this page.",
    insertSignature: "Insert signature",
    cache: "Local processing. Pages with redaction or replaced text are flattened and sanitized before export.",
  },
  es: {
    openTitle: "Abre el PDF que quieres editar",
    openDescription: "El archivo permanece temporalmente en tu navegador. Los borradores e imágenes caducan automáticamente en hasta 4 horas.",
    selectPdf: "Seleccionar PDF",
    noUpload: "Sin subida a LIM PDF",
    recentDrafts: "Borradores recientes",
    select: "Seleccionar",
    addText: "Añadir texto",
    highlight: "Resaltar",
    redact: "Redactar",
    comment: "Comentario",
    signature: "Firma",
    addImage: "Añadir imagen",
    pages: "Páginas",
    properties: "Propiedades",
    delete: "Eliminar",
    copy: "Copiar",
    duplicate: "Duplicar",
    paste: "Pegar",
    content: "Contenido",
    fontSize: "Tamaño de fuente",
    layers: "Capas de la página",
    noLayers: "No se añadió ninguna capa a esta página.",
    insertSignature: "Insertar firma",
    cache: "Procesamiento local. Las páginas con redacción o texto sustituido se aplanan y sanitizan antes de exportar.",
  },
};

type PagePreview = {
  pageIndex: number;
  sourcePageIndex: number | null;
  width: number;
  height: number;
  scale: number;
  previewUrl: string;
  isBlank?: boolean;
};

type BlankPageDraft = {
  pageIndex: number;
  width: number;
  height: number;
  scale: number;
  isBlank: true;
};

type BaseObject = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked?: boolean;
  hidden?: boolean;
};

type TextReplacementObject = BaseObject & {
  kind: "text-replacement";
  originalText: string;
  text: string;
  fontSize: number;
};

type TextObject = BaseObject & {
  kind: "text";
  text: string;
  fontSize: number;
};

type ImageObject = BaseObject & {
  kind: "image";
  file: File;
  previewUrl: string;
};

type PersistedImageObject = BaseObject & { kind: "image" };
type RedactionObject = BaseObject & { kind: "redaction" };
type HighlightObject = BaseObject & { kind: "highlight"; color: string };
type CommentObject = BaseObject & { kind: "comment"; text: string };
type SignatureObject = BaseObject & { kind: "signature"; dataUrl: string };

type EditorObject =
  | TextReplacementObject
  | TextObject
  | ImageObject
  | RedactionObject
  | HighlightObject
  | CommentObject
  | SignatureObject;

type PersistedObject =
  | TextReplacementObject
  | TextObject
  | PersistedImageObject
  | RedactionObject
  | HighlightObject
  | CommentObject
  | SignatureObject;

type EditorDraft = {
  fileKey: string;
  fileName: string;
  fileSize: number;
  updatedAt: string;
  pageSequence: number[];
  blankPages: BlankPageDraft[];
  objects: PersistedObject[];
};

type EditorRecent = {
  fileKey: string;
  fileName: string;
  fileSize: number;
  updatedAt: string;
  objectCount: number;
};

type TextContentItem = {
  str: string;
  width: number;
  height: number;
  transform: number[];
};

type DragState = {
  mode: "move" | "resize";
  objectId: string;
  objectIds: string[];
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startObject: EditorObject;
  startObjects: EditorObject[];
  changed: boolean;
};

type EditorStatus = "idle" | "loading" | "ready" | "exporting" | "error";
type PdfJsDocument = Awaited<ReturnType<typeof loadPdfJsDocument>>;

function isTextContentItem(item: unknown): item is TextContentItem {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<TextContentItem>;
  return typeof candidate.str === "string" && Array.isArray(candidate.transform);
}

function safeScale(width: number, height: number, requested: number, maxPixels: number) {
  if (width * height * requested * requested <= maxPixels) return requested;
  return Math.min(requested, Math.sqrt(maxPixels / Math.max(1, width * height)));
}

function pagePdfSize(page: PagePreview) {
  return { width: page.width / page.scale, height: page.height / page.scale };
}

function cloneObjects(objects: EditorObject[]) {
  return objects.map((object) => ({ ...object } as EditorObject));
}

function objectsEqual(left: EditorObject[], right: EditorObject[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pushLimited<T>(items: T[], item: T) {
  return [...items.slice(Math.max(0, items.length - HISTORY_LIMIT + 1)), item];
}

function clampObject(object: EditorObject, page?: PagePreview): EditorObject {
  if (!page) return object;
  const size = pagePdfSize(page);
  const width = Math.max(MIN_OBJECT_SIZE, Math.min(object.width, size.width));
  const height = Math.max(MIN_OBJECT_SIZE, Math.min(object.height, size.height));
  return {
    ...object,
    width,
    height,
    x: Math.max(0, Math.min(object.x, size.width - width)),
    y: Math.max(0, Math.min(object.y, size.height - height)),
  } as EditorObject;
}

function createBlankPreview(width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}"><rect width="100%" height="100%" fill="#fff"/><rect x="1" y="1" width="${Math.max(0, Math.ceil(width) - 2)}" height="${Math.max(0, Math.ceil(height) - 2)}" fill="none" stroke="#eef2f6" stroke-width="2"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function editorFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function loadDraft(file: File) {
  cleanupExpiredEditorDrafts();
  return safeReadJson<EditorDraft | null>(`${EDITOR_DRAFT_PREFIX}${editorFileKey(file)}`, null);
}

function serializeObjects(objects: EditorObject[]): PersistedObject[] {
  const result: PersistedObject[] = [];
  for (const object of objects) {
    if (object.kind === "text-replacement" && object.text === object.originalText && !object.locked && !object.hidden) continue;
    if (object.kind === "image") {
      result.push({
        kind: "image",
        id: object.id,
        pageIndex: object.pageIndex,
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        zIndex: object.zIndex,
        locked: object.locked,
        hidden: object.hidden,
      });
      continue;
    }
    result.push({ ...object });
  }
  return result;
}

function saveDraft(file: File, pageSequence: number[], pages: PagePreview[], objects: EditorObject[]) {
  const now = new Date().toISOString();
  const fileKey = editorFileKey(file);
  const serialized = serializeObjects(objects);
  const draft: EditorDraft = {
    fileKey,
    fileName: file.name,
    fileSize: file.size,
    updatedAt: now,
    pageSequence,
    blankPages: pages
      .filter((page) => page.sourcePageIndex === null || page.isBlank)
      .map((page) => ({ pageIndex: page.pageIndex, width: page.width, height: page.height, scale: page.scale, isBlank: true })),
    objects: serialized,
  };
  try {
    window.localStorage.setItem(`${EDITOR_DRAFT_PREFIX}${fileKey}`, JSON.stringify(draft));
    const recents = safeReadJson<EditorRecent[]>(EDITOR_RECENTS_KEY, []).filter((item) => item.fileKey !== fileKey);
    window.localStorage.setItem(EDITOR_RECENTS_KEY, JSON.stringify([
      { fileKey, fileName: file.name, fileSize: file.size, updatedAt: now, objectCount: serialized.length },
      ...recents,
    ].slice(0, 6)));
    return now;
  } catch {
    return null;
  }
}

function formatDraftDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "recente";
  }
}

function formatBytes(size: number) {
  return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function objectLabel(object: EditorObject) {
  if (object.kind === "image") return "Imagem";
  if (object.kind === "signature") return "Assinatura";
  if (object.kind === "redaction") return "Redação segura";
  if (object.kind === "highlight") return "Destaque";
  if (object.kind === "comment") return object.text || "Comentário";
  if (object.kind === "text") return object.text || "Texto";
  return object.text !== object.originalText ? object.text : object.originalText;
}

function kindLabel(object: EditorObject) {
  if (object.kind === "text-replacement") return "Texto detectado";
  if (object.kind === "redaction") return "Redação segura";
  if (object.kind === "highlight") return "Destaque";
  if (object.kind === "comment") return "Comentário";
  if (object.kind === "signature") return "Assinatura";
  if (object.kind === "image") return "Imagem";
  return "Texto";
}

function hasText(object: EditorObject): object is TextReplacementObject | TextObject | CommentObject {
  return object.kind === "text-replacement" || object.kind === "text" || object.kind === "comment";
}

function hasFontSize(object: EditorObject): object is TextReplacementObject | TextObject {
  return object.kind === "text-replacement" || object.kind === "text";
}

function objectStyle(object: EditorObject, page: PagePreview, zoom: number) {
  const scale = page.scale * zoom;
  return {
    left: object.x * scale,
    top: `calc(100% - ${(object.y + object.height) * scale}px)`,
    width: object.width * scale,
    height: object.height * scale,
    zIndex: object.zIndex,
  };
}

function hexColor(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r: 1, g: 0.88, b: 0.28 };
  return {
    r: Number.parseInt(value.slice(0, 2), 16) / 255,
    g: Number.parseInt(value.slice(2, 4), 16) / 255,
    b: Number.parseInt(value.slice(4, 6), 16) / 255,
  };
}

async function dataUrlBytes(dataUrl: string) {
  return (await fetch(dataUrl)).arrayBuffer();
}

async function sanitizedPageImage(document: PdfJsDocument, sourcePageIndex: number, objects: EditorObject[]) {
  const sourcePage = await document.getPage(sourcePageIndex + 1);
  try {
    const base = sourcePage.getViewport({ scale: 1 });
    const scale = safeScale(base.width, base.height, SANITIZE_SCALE, MAX_SANITIZE_PIXELS);
    const viewport = sourcePage.getViewport({ scale });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Não foi possível criar a página sanitizada.");
    await sourcePage.render({ canvas, canvasContext: context, viewport }).promise;

    for (const object of objects) {
      const changedText = object.kind === "text-replacement" && object.text !== object.originalText;
      if (object.kind !== "redaction" && !changedText) continue;
      const padding = Math.max(2, Math.round(scale * 1.5));
      const x = Math.floor(object.x * scale) - padding;
      const y = Math.floor(canvas.height - (object.y + object.height) * scale) - padding;
      const width = Math.ceil(object.width * scale) + padding * 2;
      const height = Math.ceil(object.height * scale) + padding * 2;
      context.fillStyle = object.kind === "redaction" ? "#000" : "#fff";
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

export function PdfEditorWorkspaceHardened() {
  const language = useLanguage() as Language;
  const text = labels[language] || labels["pt-BR"];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const objectsRef = useRef<EditorObject[]>([]);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] || null;
  const { restored, cached, clearCache } = useTemporaryFiles("tool:editar-pdf", files, setFiles);
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [pageSequence, setPageSequence] = useState<number[]>([]);
  const [objects, setObjects] = useState<EditorObject[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<EditorObject[]>([]);
  const [undoStack, setUndoStack] = useState<EditorObject[][]>([]);
  const [redoStack, setRedoStack] = useState<EditorObject[][]>([]);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [message, setMessage] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [recentDrafts, setRecentDrafts] = useState<EditorRecent[]>(() => {
    if (typeof window === "undefined") return [];
    cleanupExpiredEditorDrafts();
    return safeReadJson<EditorRecent[]>(EDITOR_RECENTS_KEY, []);
  });
  useEffect(() => {
    window.document.getElementById("editor-pdf-file-input")?.setAttribute("data-editor-ready", "true");
  }, []);

  const currentPageId = pageSequence[currentPage];
  const page = pages.find((item) => item.pageIndex === currentPageId) || null;
  const selectedObjects = useMemo(() => selectedIds.map((id) => objects.find((object) => object.id === id)).filter((object): object is EditorObject => Boolean(object)), [objects, selectedIds]);
  const selectedObject = selectedObjects.at(-1) || null;
  const pageObjects = useMemo(() => page ? objects.filter((object) => object.pageIndex === page.pageIndex && !object.hidden).sort((a, b) => a.zIndex - b.zIndex) : [], [objects, page]);
  const layers = useMemo(() => page ? objects.filter((object) => object.pageIndex === page.pageIndex).sort((a, b) => b.zIndex - a.zIndex) : [], [objects, page]);

  const registerUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const releaseUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => () => releaseUrls(), [releaseUrls]);
  useEffect(() => { objectsRef.current = objects; }, [objects]);

  const clearSelection = useCallback(() => setSelectedIds([]), [setSelectedIds]);

  const applyObjects = useCallback((updater: (current: EditorObject[]) => EditorObject[], select?: string[]) => {
    setObjects((current) => {
      const before = cloneObjects(current);
      const after = updater(current).map((object) => clampObject(object, pages.find((candidate) => candidate.pageIndex === object.pageIndex)));
      if (!objectsEqual(before, after)) {
        setUndoStack((stack) => pushLimited(stack, before));
        setRedoStack([]);
      }
      return after;
    });
    if (select) setSelectedIds(select);
  }, [pages, setSelectedIds]);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      const previous = stack.at(-1);
      if (!previous) return stack;
      setRedoStack((redo) => pushLimited(redo, cloneObjects(objectsRef.current)));
      setObjects(cloneObjects(previous));
      clearSelection();
      return stack.slice(0, -1);
    });
  }, [clearSelection]);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      const next = stack.at(-1);
      if (!next) return stack;
      setUndoStack((undo) => pushLimited(undo, cloneObjects(objectsRef.current)));
      setObjects(cloneObjects(next));
      clearSelection();
      return stack.slice(0, -1);
    });
  }, [clearSelection]);

  function updateObject(id: string, patch: Partial<EditorObject>) {
    applyObjects((current) => current.map((object) => object.id === id ? { ...object, ...patch } as EditorObject : object));
  }

  function nextZ() {
    return Math.max(0, ...objects.map((object) => object.zIndex)) + 1;
  }

  const openFile = useCallback((selectedFile: File) => {
    if (!isPdfFile(selectedFile)) {
      setStatus("error");
      setMessage("Selecione um arquivo PDF.");
      return;
    }
    if (!isFileWithinLimit(selectedFile, MAX_LOCAL_PDF_BYTES)) {
      setStatus("error");
      setMessage("O arquivo ultrapassa o limite recomendado de 60 MB.");
      return;
    }
    releaseUrls();
    setFiles([selectedFile]);
  }, [releaseUrls, setFiles]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    void (async () => {
      setStatus("loading");
      setMessage("Preparando visualização e camadas editáveis...");
      try {
        const bytes = await file.arrayBuffer();
        const document = await loadPdfJsDocument(bytes.slice(0));
        const nextPages: PagePreview[] = [];
        const detectedObjects: TextReplacementObject[] = [];
        let zIndex = 1;
        try {
          for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
            if (cancelled) return;
            const pdfPage = await document.getPage(pageNumber);
            try {
              const base = pdfPage.getViewport({ scale: 1 });
              const scale = safeScale(base.width, base.height, PREVIEW_SCALE, MAX_PREVIEW_PIXELS);
              const viewport = pdfPage.getViewport({ scale });
              const canvas = window.document.createElement("canvas");
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              const context = canvas.getContext("2d", { alpha: false });
              if (!context) throw new Error("O navegador não conseguiu criar a visualização.");
              await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
              const previewBlob = await canvasToBlob(canvas, "image/jpeg", 0.78);
              const previewUrl = registerUrl(previewBlob);
              const content = await pdfPage.getTextContent();
              const textItems = content.items.filter(isTextContentItem) as TextContentItem[];
              textItems.filter((item) => item.str.trim()).forEach((item, index) => {
                const fontSize = Math.max(6, Math.hypot(item.transform[0], item.transform[1]));
                detectedObjects.push({
                  id: `text:${pageNumber - 1}:${index}`,
                  kind: "text-replacement",
                  pageIndex: pageNumber - 1,
                  originalText: item.str,
                  text: item.str,
                  x: Math.max(0, item.transform[4] - 1.5),
                  y: Math.max(0, item.transform[5] - fontSize * 0.25),
                  width: Math.max(item.width, fontSize * 0.65),
                  height: Math.max(fontSize * 1.25, 9),
                  fontSize,
                  zIndex: zIndex++,
                });
              });
              nextPages.push({ pageIndex: pageNumber - 1, sourcePageIndex: pageNumber - 1, width: canvas.width, height: canvas.height, scale, previewUrl });
              canvas.width = 1;
              canvas.height = 1;
            } finally {
              pdfPage.cleanup();
            }
          }
        } finally {
          await document.cleanup();
        }

        const draft = loadDraft(file);
        if (draft) {
          for (const blank of draft.blankPages || []) {
            if (!nextPages.some((item) => item.pageIndex === blank.pageIndex)) {
              nextPages.push({ ...blank, sourcePageIndex: null, previewUrl: createBlankPreview(blank.width, blank.height) });
            }
          }
        }

        const validDraft = Boolean(draft?.pageSequence.length && draft.pageSequence.every((pageId) => nextPages.some((candidate) => candidate.pageIndex === pageId)));
        let restoredObjects: EditorObject[] = detectedObjects;
        if (draft && validDraft) {
          const imageAssets = await loadEditorImageAssets(draft.fileKey).catch(() => []);
          const imageMap = new Map(imageAssets.map((asset) => [asset.objectId, asset.file]));
          const replacementMap = new Map<string, TextReplacementObject>();
          for (const persisted of draft.objects) {
            if (persisted.kind === "text-replacement") replacementMap.set(persisted.id, persisted);
          }
          const mergedDetected = detectedObjects.map((object) => replacementMap.has(object.id) ? { ...object, ...replacementMap.get(object.id)! } : object);
          const custom: EditorObject[] = [];
          for (const persisted of draft.objects) {
            if (persisted.kind === "text-replacement") continue;
            if (persisted.kind === "image") {
              const imageFile = imageMap.get(persisted.id);
              if (!imageFile) continue;
              custom.push({ ...persisted, file: imageFile, previewUrl: registerUrl(imageFile) });
            } else {
              custom.push({ ...persisted });
            }
          }
          restoredObjects = [...mergedDetected, ...custom];
        }

        if (cancelled) return;
        setPages(nextPages);
        setPageSequence(validDraft && draft ? draft.pageSequence : nextPages.filter((item) => item.sourcePageIndex !== null).map((item) => item.pageIndex));
        setObjects(restoredObjects.map((object) => clampObject(object, nextPages.find((candidate) => candidate.pageIndex === object.pageIndex))));
        setCurrentPage(0);
        clearSelection();
        setUndoStack([]);
        setRedoStack([]);
        setDraftSavedAt(validDraft ? draft?.updatedAt || null : null);
        setDraftRestored(Boolean(validDraft && draft));
        setStatus("ready");
        setMessage(validDraft && draft ? "Rascunho local recuperado, incluindo imagens disponíveis." : restored ? "Sessão recuperada do cache temporário." : "PDF pronto. Redações e substituições serão sanitizadas ao exportar.");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Não foi possível abrir o PDF. Verifique se ele não está protegido ou corrompido.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [clearSelection, file, registerUrl, restored]);

  useEffect(() => {
    if (!file || status !== "ready" || !pages.length) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        const assets: { objectId: string; file: File }[] = [];
        for (const object of objects) {
          if (object.kind === "image") assets.push({ objectId: object.id, file: object.file });
        }
        try {
          const assetsSaved = await saveEditorImageAssets(editorFileKey(file), assets);
          if (cancelled) return;
          if (!assetsSaved) {
            setDraftSavedAt(null);
            setMessage("Rascunho não salvo: as imagens excedem o limite temporário de 40 MB. Remova ou reduza imagens para salvar com segurança.");
            return;
          }
          const savedAt = saveDraft(file, pageSequence, pages, objects);
          if (savedAt) {
            setDraftSavedAt(savedAt);
            setRecentDrafts(safeReadJson<EditorRecent[]>(EDITOR_RECENTS_KEY, []));
          } else {
            setDraftSavedAt(null);
            setMessage("Não foi possível salvar o rascunho local neste dispositivo.");
          }
        } catch {
          if (!cancelled) {
            setDraftSavedAt(null);
            setMessage("Não foi possível persistir as imagens do rascunho. O rascunho não foi marcado como salvo.");
          }
        }
      })();
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [file, objects, pageSequence, pages, status]);

  function addText() {
    if (!page) return;
    const size = pagePdfSize(page);
    const id = crypto.randomUUID();
    const object: TextObject = { id, kind: "text", pageIndex: page.pageIndex, text: "Novo texto", x: Math.max(20, size.width * 0.12), y: Math.max(20, size.height * 0.78), width: 150, height: 24, fontSize: 18, zIndex: nextZ() };
    applyObjects((current) => [...current, object], [id]);
  }

  function addImage(imageFile: File) {
    if (!page || !["image/jpeg", "image/png"].includes(imageFile.type)) {
      setMessage("Selecione uma imagem JPG ou PNG.");
      return;
    }
    if (imageFile.size > MAX_IMAGE_SIZE) {
      setMessage("A imagem ultrapassa o limite de 20 MB.");
      return;
    }
    const id = crypto.randomUUID();
    const object: ImageObject = { id, kind: "image", pageIndex: page.pageIndex, file: imageFile, previewUrl: registerUrl(imageFile), x: 70, y: 70, width: 180, height: 120, zIndex: nextZ() };
    applyObjects((current) => [...current, object], [id]);
  }

  function addRedaction() {
    if (!page) return;
    const size = pagePdfSize(page);
    const id = crypto.randomUUID();
    const object: RedactionObject = { id, kind: "redaction", pageIndex: page.pageIndex, x: Math.max(18, size.width * 0.16), y: Math.max(18, size.height * 0.58), width: Math.min(230, size.width * 0.42), height: 34, zIndex: nextZ() };
    applyObjects((current) => [...current, object], [id]);
  }

  function addHighlight() {
    if (!page) return;
    const size = pagePdfSize(page);
    const id = crypto.randomUUID();
    const object: HighlightObject = { id, kind: "highlight", pageIndex: page.pageIndex, color: "#ffe15a", x: Math.max(18, size.width * 0.16), y: Math.max(18, size.height * 0.5), width: Math.min(230, size.width * 0.42), height: 26, zIndex: nextZ() };
    applyObjects((current) => [...current, object], [id]);
  }

  function addComment() {
    if (!page) return;
    const size = pagePdfSize(page);
    const id = crypto.randomUUID();
    const value = language === "en" ? "Comment" : language === "es" ? "Comentario" : "Comentário";
    const object: CommentObject = { id, kind: "comment", pageIndex: page.pageIndex, text: value, x: Math.max(18, size.width * 0.16), y: Math.max(18, size.height * 0.38), width: Math.min(190, size.width * 0.34), height: 72, zIndex: nextZ() };
    applyObjects((current) => [...current, object], [id]);
  }

  function addSignature() {
    if (!page || !signatureDataUrl) {
      setMessage("Desenhe a assinatura no painel para inserir no PDF.");
      return;
    }
    const size = pagePdfSize(page);
    const id = crypto.randomUUID();
    const object: SignatureObject = { id, kind: "signature", pageIndex: page.pageIndex, dataUrl: signatureDataUrl, x: Math.max(18, size.width * 0.16), y: Math.max(18, size.height * 0.22), width: Math.min(210, size.width * 0.38), height: 74, zIndex: nextZ() };
    applyObjects((current) => [...current, object], [id]);
  }

  const copySelected = useCallback(() => {
    if (!selectedObjects.length) return;
    setClipboard(cloneObjects(selectedObjects));
    setMessage(`${selectedObjects.length} objeto(s) copiado(s).`);
  }, [selectedObjects]);

  const duplicateSelected = useCallback(() => {
    if (!selectedObjects.length) return;
    const maxZ = Math.max(0, ...objects.map((object) => object.zIndex));
    const copies: EditorObject[] = [];
    selectedObjects.forEach((object, index) => {
      if (object.kind === "image") {
        copies.push({ ...object, id: crypto.randomUUID(), previewUrl: registerUrl(object.file), x: object.x + 14, y: object.y - 14, zIndex: maxZ + index + 1, locked: false, hidden: false });
      } else {
        copies.push({ ...object, id: crypto.randomUUID(), x: object.x + 14, y: object.y - 14, zIndex: maxZ + index + 1, locked: false, hidden: false } as EditorObject);
      }
    });
    applyObjects((current) => [...current, ...copies], copies.map((object) => object.id));
  }, [applyObjects, objects, registerUrl, selectedObjects]);

  const pasteSelected = useCallback(() => {
    if (!clipboard.length || !page) return;
    const maxZ = Math.max(0, ...objects.map((object) => object.zIndex));
    const copies: EditorObject[] = [];
    clipboard.forEach((object, index) => {
      if (object.kind === "image") {
        copies.push({ ...object, id: crypto.randomUUID(), pageIndex: page.pageIndex, previewUrl: registerUrl(object.file), x: object.x + 18, y: object.y - 18, zIndex: maxZ + index + 1, locked: false, hidden: false });
      } else {
        copies.push({ ...object, id: crypto.randomUUID(), pageIndex: page.pageIndex, x: object.x + 18, y: object.y - 18, zIndex: maxZ + index + 1, locked: false, hidden: false } as EditorObject);
      }
    });
    applyObjects((current) => [...current, ...copies], copies.map((object) => object.id));
  }, [applyObjects, clipboard, objects, page, registerUrl]);

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return;
    const selected = new Set(selectedIds);
    const locked = objects.filter((object) => selected.has(object.id) && object.locked).length;
    applyObjects((current) => current.filter((object) => !selected.has(object.id) || object.locked), []);
    if (locked) setMessage(`${locked} objeto(s) bloqueado(s) foram preservados.`);
  }, [applyObjects, objects, selectedIds]);

  function movePage(direction: -1 | 1) {
    setPageSequence((current) => {
      const target = currentPage + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[currentPage], next[target]] = [next[target], next[currentPage]];
      setCurrentPage(target);
      clearSelection();
      return next;
    });
  }

  function duplicatePage() {
    if (currentPageId === undefined) return;
    setPageSequence((current) => {
      const next = [...current];
      next.splice(currentPage + 1, 0, currentPageId);
      setCurrentPage(currentPage + 1);
      clearSelection();
      return next;
    });
  }

  function deletePage() {
    if (pageSequence.length <= 1) {
      setMessage("O documento precisa manter pelo menos uma página.");
      return;
    }
    setPageSequence((current) => {
      const next = current.filter((_, index) => index !== currentPage);
      setCurrentPage(Math.max(0, Math.min(currentPage, next.length - 1)));
      clearSelection();
      return next;
    });
  }

  function insertBlankPage() {
    const base = page || pages[0];
    if (!base) return;
    const pageIndex = Math.max(-1, ...pages.map((item) => item.pageIndex)) + 1;
    const blank: PagePreview = { pageIndex, sourcePageIndex: null, width: base.width, height: base.height, scale: base.scale, previewUrl: createBlankPreview(base.width, base.height), isBlank: true };
    setPages((current) => [...current, blank]);
    setPageSequence((current) => {
      const next = [...current];
      next.splice(currentPage + 1, 0, pageIndex);
      return next;
    });
    setCurrentPage(currentPage + 1);
    clearSelection();
  }

  function moveLayer(direction: "front" | "back" | "up" | "down") {
    if (!selectedObject || selectedObject.locked) return;
    const samePage = objects.filter((object) => object.pageIndex === selectedObject.pageIndex).sort((a, b) => a.zIndex - b.zIndex);
    const index = samePage.findIndex((object) => object.id === selectedObject.id);
    if (index < 0) return;
    let zIndex = selectedObject.zIndex;
    if (direction === "front") zIndex = Math.max(...samePage.map((object) => object.zIndex)) + 1;
    if (direction === "back") zIndex = Math.min(...samePage.map((object) => object.zIndex)) - 1;
    if (direction === "up" && samePage[index + 1]) zIndex = samePage[index + 1].zIndex + 0.5;
    if (direction === "down" && samePage[index - 1]) zIndex = samePage[index - 1].zIndex - 0.5;
    updateObject(selectedObject.id, { zIndex } as Partial<EditorObject>);
  }

  function alignSelected(mode: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    const movable = selectedObjects.filter((object) => !object.locked);
    if (movable.length < 2) return;
    const ids = new Set(movable.map((object) => object.id));
    const left = Math.min(...movable.map((object) => object.x));
    const right = Math.max(...movable.map((object) => object.x + object.width));
    const bottom = Math.min(...movable.map((object) => object.y));
    const top = Math.max(...movable.map((object) => object.y + object.height));
    const centerX = (left + right) / 2;
    const centerY = (bottom + top) / 2;
    applyObjects((current) => current.map((object) => {
      if (!ids.has(object.id)) return object;
      if (mode === "left") return { ...object, x: left } as EditorObject;
      if (mode === "right") return { ...object, x: right - object.width } as EditorObject;
      if (mode === "center") return { ...object, x: centerX - object.width / 2 } as EditorObject;
      if (mode === "bottom") return { ...object, y: bottom } as EditorObject;
      if (mode === "top") return { ...object, y: top - object.height } as EditorObject;
      return { ...object, y: centerY - object.height / 2 } as EditorObject;
    }));
  }

  function distributeSelected(axis: "horizontal" | "vertical") {
    const movable = selectedObjects.filter((object) => !object.locked).sort((a, b) => axis === "horizontal" ? a.x - b.x : a.y - b.y);
    if (movable.length < 3) return;
    const first = movable[0];
    const last = movable.at(-1)!;
    const firstCenter = axis === "horizontal" ? first.x + first.width / 2 : first.y + first.height / 2;
    const lastCenter = axis === "horizontal" ? last.x + last.width / 2 : last.y + last.height / 2;
    const gap = (lastCenter - firstCenter) / (movable.length - 1);
    const centers = new Map<string, number>();
    movable.forEach((object, index) => centers.set(object.id, firstCenter + gap * index));
    applyObjects((current) => current.map((object) => {
      const center = centers.get(object.id);
      if (center === undefined) return object;
      return axis === "horizontal" ? { ...object, x: center - object.width / 2 } as EditorObject : { ...object, y: center - object.height / 2 } as EditorObject;
    }));
  }

  function beginDrag(event: React.PointerEvent<HTMLElement>, object: EditorObject, mode: "move" | "resize") {
    if (!page) return;
    event.preventDefault();
    event.stopPropagation();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    if (additive && mode === "move") {
      setSelectedIds((current) => current.includes(object.id) ? current.filter((id) => id !== object.id) : [...current, object.id]);
      return;
    }
    if (object.locked) {
      setSelectedIds([object.id]);
      setMessage("Camada bloqueada. Desbloqueie para mover ou redimensionar.");
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const dragIds = selectedIds.includes(object.id) ? selectedIds : [object.id];
    setSelectedIds(dragIds);
    dragRef.current = {
      mode,
      objectId: object.id,
      objectIds: mode === "move" ? dragIds : [object.id],
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startObject: { ...object } as EditorObject,
      startObjects: cloneObjects(objectsRef.current),
      changed: false,
    };
  }

  function continueDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !page) return;
    event.preventDefault();
    const dx = (event.clientX - drag.startClientX) / (page.scale * zoom);
    const dy = (event.clientY - drag.startClientY) / (page.scale * zoom);
    setObjects((current) => current.map((object) => {
      if (drag.mode === "resize") {
        if (object.id !== drag.objectId || object.locked) return object;
        return clampObject({ ...drag.startObject, width: drag.startObject.width + dx, height: drag.startObject.height + dy, y: drag.startObject.y - dy } as EditorObject, pages.find((candidate) => candidate.pageIndex === object.pageIndex));
      }
      if (!drag.objectIds.includes(object.id) || object.locked) return object;
      const start = drag.startObjects.find((candidate) => candidate.id === object.id) || object;
      return clampObject({ ...object, x: start.x + dx, y: start.y - dy } as EditorObject, pages.find((candidate) => candidate.pageIndex === object.pageIndex));
    }));
    drag.changed = true;
  }

  function endDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.changed && !objectsEqual(drag.startObjects, objectsRef.current)) {
      setUndoStack((stack) => pushLimited(stack, drag.startObjects));
      setRedoStack([]);
    }
    dragRef.current = null;
  }

  const nudge = useCallback((x: number, y: number) => {
    if (!selectedIds.length) return;
    const ids = new Set(selectedIds);
    applyObjects((current) => current.map((object) => ids.has(object.id) && !object.locked ? { ...object, x: object.x + x, y: object.y + y } as EditorObject : object));
  }, [applyObjects, selectedIds]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) { event.preventDefault(); undo(); return; }
      if ((mod && event.key.toLowerCase() === "y") || (mod && event.shiftKey && event.key.toLowerCase() === "z")) { event.preventDefault(); redo(); return; }
      if (!typing && mod && event.key.toLowerCase() === "a") { event.preventDefault(); setSelectedIds(pageObjects.map((object) => object.id)); return; }
      if (!typing && mod && event.key.toLowerCase() === "c") { event.preventDefault(); copySelected(); return; }
      if (!typing && mod && event.key.toLowerCase() === "v") { event.preventDefault(); pasteSelected(); return; }
      if (!typing && mod && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateSelected(); return; }
      if (typing || !selectedIds.length) return;
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelected(); return; }
      if (event.key === "Escape") { clearSelection(); return; }
      const step = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowLeft") { event.preventDefault(); nudge(-step, 0); }
      if (event.key === "ArrowRight") { event.preventDefault(); nudge(step, 0); }
      if (event.key === "ArrowUp") { event.preventDefault(); nudge(0, step); }
      if (event.key === "ArrowDown") { event.preventDefault(); nudge(0, -step); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [clearSelection, copySelected, deleteSelected, duplicateSelected, nudge, pageObjects, pasteSelected, redo, selectedIds.length, undo]);

  async function exportPdf() {
    if (!file) return;
    setStatus("exporting");
    setMessage("Aplicando alterações e sanitizando conteúdo substituído...");
    let sanitizeDocument: PdfJsDocument | null = null;
    try {
      const pdfLib = await import("pdf-lib");
      const sourceBytes = await file.arrayBuffer();
      const sourcePdf = await pdfLib.PDFDocument.load(sourceBytes.slice(0));
      const output = await pdfLib.PDFDocument.create();
      const font = await output.embedFont(pdfLib.StandardFonts.Helvetica);
      const orderedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex);
      const needsSanitization = orderedObjects.some((object) => object.kind === "redaction" || (object.kind === "text-replacement" && object.text !== object.originalText));
      if (needsSanitization) sanitizeDocument = await loadPdfJsDocument(sourceBytes.slice(0));

      for (const pageId of pageSequence) {
        const preview = pages.find((candidate) => candidate.pageIndex === pageId);
        if (!preview) continue;
        const visibleObjects = orderedObjects.filter((object) => object.pageIndex === preview.pageIndex && !object.hidden);
        const sanitizerObjects = visibleObjects.filter((object) => object.kind === "redaction" || (object.kind === "text-replacement" && object.text !== object.originalText));
        let pdfPage;

        if (preview.sourcePageIndex === null || preview.isBlank) {
          const size = pagePdfSize(preview);
          pdfPage = output.addPage([size.width, size.height]);
        } else if (sanitizerObjects.length && sanitizeDocument) {
          const sanitized = await sanitizedPageImage(sanitizeDocument, preview.sourcePageIndex, sanitizerObjects);
          pdfPage = output.addPage([sanitized.width, sanitized.height]);
          const image = await output.embedJpg(sanitized.bytes);
          pdfPage.drawImage(image, { x: 0, y: 0, width: sanitized.width, height: sanitized.height });
        } else {
          const [copied] = await output.copyPages(sourcePdf, [preview.sourcePageIndex]);
          pdfPage = output.addPage(copied);
        }

        for (const object of visibleObjects) {
          if (object.kind === "text-replacement") {
            if (object.text === object.originalText || !object.text.trim()) continue;
            pdfPage.drawText(object.text, { x: object.x + 1.5, y: object.y + Math.max(1, object.height * 0.18), size: Math.max(6, Math.min(72, object.fontSize)), font, color: pdfLib.rgb(0.05, 0.08, 0.15), maxWidth: Math.max(20, pdfPage.getWidth() - object.x - 18) });
            continue;
          }
          if (object.kind === "redaction") {
            pdfPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, color: pdfLib.rgb(0, 0, 0) });
            continue;
          }
          if (object.kind === "highlight") {
            const color = hexColor(object.color);
            pdfPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, color: pdfLib.rgb(color.r, color.g, color.b), opacity: 0.45 });
            continue;
          }
          if (object.kind === "comment") {
            pdfPage.drawRectangle({ x: object.x, y: object.y, width: object.width, height: object.height, color: pdfLib.rgb(1, 0.96, 0.72), borderColor: pdfLib.rgb(0.9, 0.62, 0.12), borderWidth: 1 });
            if (object.text.trim()) pdfPage.drawText(object.text, { x: object.x + 6, y: object.y + object.height - 15, size: 9, font, color: pdfLib.rgb(0.17, 0.14, 0.08), maxWidth: Math.max(20, object.width - 12) });
            continue;
          }
          if (object.kind === "text") {
            pdfPage.drawText(object.text, { x: object.x, y: object.y, size: Math.max(6, Math.min(120, object.fontSize)), font, color: pdfLib.rgb(0.05, 0.08, 0.15), maxWidth: object.width });
            continue;
          }
          if (object.kind === "image") {
            const bytes = await object.file.arrayBuffer();
            const image = object.file.type === "image/png" ? await output.embedPng(bytes) : await output.embedJpg(bytes);
            pdfPage.drawImage(image, { x: object.x, y: object.y, width: object.width, height: object.height });
            continue;
          }
          const image = await output.embedPng(await dataUrlBytes(object.dataUrl));
          pdfPage.drawImage(image, { x: object.x, y: object.y, width: object.width, height: object.height });
        }
      }

      downloadBytes(await output.save({ useObjectStreams: true }), `${file.name.replace(/\.pdf$/i, "")}-editado-lim-pdf.pdf`);
      setStatus("ready");
      setMessage(needsSanitization ? "PDF exportado. Áreas redigidas ou substituídas foram removidas da base achatada da página." : "PDF editado. O download foi iniciado.");
    } catch {
      setStatus("error");
      setMessage("Não foi possível exportar as alterações deste PDF.");
    } finally {
      if (sanitizeDocument) {
        try { await sanitizeDocument.cleanup(); } catch { /* no-op */ }
      }
    }
  }

  function closeDocument() {
    releaseUrls();
    setFiles([]);
    setPages([]);
    setPageSequence([]);
    setObjects([]);
    setClipboard([]);
    setUndoStack([]);
    setRedoStack([]);
    setCurrentPage(0);
    clearSelection();
    clearCache();
  }

  if (!file) {
    return (
      <section className="editor-upload-card">
        <span className="editor-upload-icon"><UploadCloud size={31} /></span>
        <h2>{text.openTitle}</h2>
        <p>{text.openDescription}</p>
        <label className="primary-button large-button editor-file-picker" htmlFor="editor-pdf-file-input" role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInputRef.current?.click(); } }}><FileText size={18} /> {text.selectPdf}</label>
        <input id="editor-pdf-file-input" data-editor-ready="false" ref={fileInputRef} type="file" accept="application/pdf" hidden onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => event.target.files?.[0] && openFile(event.target.files[0])} />
        {recentDrafts.length ? <div className="editor-recent-drafts"><strong>{text.recentDrafts}</strong>{recentDrafts.map((draft) => <div key={draft.fileKey}><span>{draft.fileName}</span><small>{formatBytes(draft.fileSize)} · {draft.objectCount} alteração(ões) · {formatDraftDate(draft.updatedAt)}</small></div>)}</div> : null}
        <div className="editor-upload-security"><ShieldCheck size={17} /> {text.noUpload}</div>
      </section>
    );
  }

  return (
    <section className="pdf-editor-shell">
      <div className="editor-topbar">
        <div className="editor-file-name"><FileText size={19} /><span><strong>{file.name}</strong><small>{draftSavedAt ? `Rascunho salvo ${formatDraftDate(draftSavedAt)}` : cached ? "Salvo temporariamente no navegador" : "Cache local indisponível para este tamanho"}{draftRestored ? " · restaurado" : ""}</small></span></div>
        <div className="editor-history"><button type="button" onClick={undo} disabled={!undoStack.length} title="Desfazer (Ctrl+Z)"><Undo2 size={17} /></button><button type="button" onClick={redo} disabled={!redoStack.length} title="Refazer (Ctrl+Y)"><Redo2 size={17} /></button></div>
        <div className="editor-top-actions"><div className="editor-zoom-controls"><button type="button" onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(2))))}>-</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(2, Number((value + 0.1).toFixed(2))))}>+</button></div><button className="secondary-button" type="button" onClick={closeDocument}><Trash2 size={16} /> Fechar</button><button className="primary-button" type="button" onClick={exportPdf} disabled={status === "loading" || status === "exporting"}><Download size={17} /> Baixar PDF</button></div>
      </div>

      <div className="editor-body">
        <aside className="editor-tools">
          <button className="active" type="button"><MousePointer2 size={20} /><span>{text.select}</span></button>
          <button type="button" onClick={addText}><Type size={20} /><span>{text.addText}</span></button>
          <button type="button" onClick={addHighlight}><PencilLine size={20} /><span>{text.highlight}</span></button>
          <button type="button" onClick={addRedaction}><ShieldCheck size={20} /><span>{text.redact}</span></button>
          <button type="button" onClick={addComment}><FileText size={20} /><span>{text.comment}</span></button>
          <button type="button" onClick={addSignature}><Signature size={20} /><span>{text.signature}</span></button>
          <button type="button" onClick={() => imageInputRef.current?.click()}><ImagePlus size={20} /><span>{text.addImage}</span></button>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png" hidden onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => event.target.files?.[0] && addImage(event.target.files[0])} />
        </aside>

        <aside className="editor-pages">
          <h2>{text.pages}</h2>
          <div className="page-production-controls">
            <button type="button" onClick={() => movePage(-1)} disabled={currentPage === 0} title="Mover página para cima" aria-label="Mover página para cima"><ArrowUp size={14} aria-hidden="true" /></button>
            <button type="button" onClick={() => movePage(1)} disabled={currentPage === pageSequence.length - 1} title="Mover página para baixo" aria-label="Mover página para baixo"><ArrowDown size={14} aria-hidden="true" /></button>
            <button type="button" onClick={duplicatePage}>Duplicar</button>
            <button type="button" onClick={insertBlankPage}>Em branco</button>
            <button type="button" onClick={deletePage} disabled={pageSequence.length <= 1}>Excluir</button>
          </div>
          {pageSequence.map((pageId, index) => {
            const item = pages.find((candidate) => candidate.pageIndex === pageId);
            if (!item) return null;
            return <button className={index === currentPage ? "active" : ""} type="button" key={`${pageId}:${index}`} onClick={() => { setCurrentPage(index); clearSelection(); }}><img src={item.previewUrl} alt={`Miniatura da página ${index + 1}`} /><span>{index + 1}</span>{item.isBlank ? <small>Em branco</small> : null}</button>;
          })}
        </aside>

        <div className="editor-stage-wrap" onPointerDown={(event) => { if (event.target === event.currentTarget) clearSelection(); }}>
          {status === "loading" ? <div className="editor-loading"><LoaderCircle className="spin" size={27} /><strong>Preparando editor</strong><p>{message}</p></div> : null}
          {page ? <div className="editor-stage" style={{ width: page.width * zoom, height: page.height * zoom }}>
            <img src={page.previewUrl} alt={`Página ${currentPage + 1} do PDF`} />
            {pageObjects.map((object) => <button
              className={`editor-object editor-object-${object.kind} ${selectedIds.includes(object.id) ? "selected" : ""} ${object.locked ? "locked" : ""} ${object.kind === "text-replacement" && object.text !== object.originalText ? "changed" : ""}`}
              type="button"
              aria-label={`Selecionar ${objectLabel(object)}`}
              title={objectLabel(object)}
              key={object.id}
              style={objectStyle(object, page, zoom)}
              onPointerDown={(event) => beginDrag(event, object, "move")}
              onPointerMove={continueDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {object.kind === "image" ? <img src={object.previewUrl} alt="Imagem adicionada" draggable={false} /> : null}
              {object.kind === "signature" ? <img src={object.dataUrl} alt="Assinatura adicionada" draggable={false} /> : null}
              {object.kind === "text" ? <span style={{ fontSize: object.fontSize * page.scale * zoom }}>{object.text}</span> : null}
              {object.kind === "text-replacement" && object.text !== object.originalText ? <span style={{ fontSize: object.fontSize * page.scale * zoom }}>{object.text}</span> : null}
              {object.kind === "redaction" ? <span>REDACTED</span> : null}
              {object.kind === "highlight" ? <span>Destaque</span> : null}
              {object.kind === "comment" ? <span>{object.text}</span> : null}
              {selectedObject?.id === object.id && !object.locked ? <span className="editor-resize-handle" role="presentation" onPointerDown={(event) => beginDrag(event, object, "resize")} onPointerMove={continueDrag} onPointerUp={endDrag} onPointerCancel={endDrag} /> : null}
            </button>)}
          </div> : null}
          {pageSequence.length ? <div className="editor-page-navigation"><button type="button" aria-label="Página anterior" disabled={currentPage === 0} onClick={() => setCurrentPage((value) => value - 1)}><ArrowLeft size={17} aria-hidden="true" /></button><span>{currentPage + 1} / {pageSequence.length}</span><button type="button" aria-label="Página seguinte" disabled={currentPage === pageSequence.length - 1} onClick={() => setCurrentPage((value) => value + 1)}><ArrowRight size={17} aria-hidden="true" /></button></div> : null}
        </div>

        <aside className="editor-properties">
          <h2>{text.properties}</h2>
          {selectedObject ? <div className="properties-panel">
            <div className="object-layer-row"><strong>{selectedObjects.length > 1 ? `${selectedObjects.length} objetos selecionados` : kindLabel(selectedObject)}</strong><button type="button" onClick={deleteSelected}><Trash2 size={15} /> {text.delete}</button></div>
            <div className="selection-actions"><button type="button" onClick={copySelected}>{text.copy}</button><button type="button" onClick={duplicateSelected}>{text.duplicate}</button><button type="button" onClick={pasteSelected} disabled={!clipboard.length}>{text.paste}</button></div>
            {selectedObjects.length === 1 && hasText(selectedObject) ? <label><span>{text.content}</span><textarea value={selectedObject.text} disabled={selectedObject.locked} onChange={(event) => updateObject(selectedObject.id, { text: event.target.value } as Partial<EditorObject>)} /></label> : null}
            {selectedObjects.length === 1 && hasFontSize(selectedObject) ? <label><span>{text.fontSize}</span><input type="number" min="6" max="120" value={selectedObject.fontSize} disabled={selectedObject.locked} onChange={(event) => updateObject(selectedObject.id, { fontSize: Number(event.target.value) || 12, height: Math.max(MIN_OBJECT_SIZE, (Number(event.target.value) || 12) * 1.35) } as Partial<EditorObject>)} /></label> : null}
            {selectedObjects.length === 1 && selectedObject.kind === "highlight" ? <label><span>Cor do destaque</span><input type="color" value={selectedObject.color} disabled={selectedObject.locked} onChange={(event) => updateObject(selectedObject.id, { color: event.target.value } as Partial<EditorObject>)} /></label> : null}
            {selectedObjects.length === 1 ? <div className="properties-grid"><label><span>X</span><input type="number" value={Math.round(selectedObject.x)} disabled={selectedObject.locked} onChange={(event) => updateObject(selectedObject.id, { x: Number(event.target.value) || 0 } as Partial<EditorObject>)} /></label><label><span>Y</span><input type="number" value={Math.round(selectedObject.y)} disabled={selectedObject.locked} onChange={(event) => updateObject(selectedObject.id, { y: Number(event.target.value) || 0 } as Partial<EditorObject>)} /></label><label><span>Largura</span><input type="number" min={MIN_OBJECT_SIZE} value={Math.round(selectedObject.width)} disabled={selectedObject.locked} onChange={(event) => updateObject(selectedObject.id, { width: Number(event.target.value) || MIN_OBJECT_SIZE } as Partial<EditorObject>)} /></label><label><span>Altura</span><input type="number" min={MIN_OBJECT_SIZE} value={Math.round(selectedObject.height)} disabled={selectedObject.locked} onChange={(event) => updateObject(selectedObject.id, { height: Number(event.target.value) || MIN_OBJECT_SIZE } as Partial<EditorObject>)} /></label></div> : null}
            {selectedObjects.length > 1 ? <div className="alignment-controls"><button type="button" onClick={() => alignSelected("left")}>Alinhar esq.</button><button type="button" onClick={() => alignSelected("center")}>Centro H</button><button type="button" onClick={() => alignSelected("right")}>Alinhar dir.</button><button type="button" onClick={() => alignSelected("top")}>Topo</button><button type="button" onClick={() => alignSelected("middle")}>Centro V</button><button type="button" onClick={() => alignSelected("bottom")}>Base</button><button type="button" onClick={() => distributeSelected("horizontal")}>Distribuir H</button><button type="button" onClick={() => distributeSelected("vertical")}>Distribuir V</button></div> : null}
            <div className="layer-controls"><button type="button" aria-label={selectedObject.hidden ? "Mostrar objeto" : "Ocultar objeto"} onClick={() => updateObject(selectedObject.id, { hidden: !selectedObject.hidden } as Partial<EditorObject>)}><CircleOff size={15} aria-hidden="true" /> {selectedObject.hidden ? "Mostrar" : "Ocultar"}</button><button type="button" aria-label={selectedObject.locked ? "Desbloquear objeto" : "Bloquear objeto"} onClick={() => updateObject(selectedObject.id, { locked: !selectedObject.locked } as Partial<EditorObject>)}><LockKeyhole size={15} aria-hidden="true" /> {selectedObject.locked ? "Desbloquear" : "Bloquear"}</button><button type="button" aria-label="Mover camada para a frente" onClick={() => moveLayer("front")}><ArrowUp size={15} aria-hidden="true" /> Frente</button><button type="button" aria-label="Mover camada para o fundo" onClick={() => moveLayer("back")}><ArrowDown size={15} aria-hidden="true" /> Fundo</button><button type="button" onClick={() => moveLayer("up")}>Subir camada</button><button type="button" onClick={() => moveLayer("down")}>Descer camada</button></div>
            {selectedObjects.length === 1 && selectedObject.kind === "text-replacement" ? <><button type="button" className="secondary-button" onClick={() => updateObject(selectedObject.id, { text: selectedObject.originalText } as Partial<EditorObject>)}>Restaurar original</button><p>Ao substituir texto, a página é achatada e os pixels do conteúdo anterior são apagados antes da exportação.</p></> : null}
          </div> : <div className="empty-properties"><MousePointer2 size={26} /><strong>Selecione um objeto</strong><p>Clique em uma camada para editar, mover, redimensionar, ocultar ou bloquear.</p></div>}

          <div className="editor-layers-panel"><div className="layers-panel-heading"><strong>{text.layers}</strong><span>{layers.length}</span></div>{layers.length ? <div className="layers-list">{layers.map((object) => <div className={`layer-item ${selectedIds.includes(object.id) ? "active" : ""} ${object.hidden ? "hidden-layer" : ""}`} key={object.id}><button type="button" className="layer-select-button" onClick={() => setSelectedIds([object.id])}><span>{kindLabel(object)}</span><small>{objectLabel(object)}</small></button><button type="button" aria-label={object.hidden ? `Mostrar ${objectLabel(object)}` : `Ocultar ${objectLabel(object)}`} onClick={() => updateObject(object.id, { hidden: !object.hidden } as Partial<EditorObject>)}><CircleOff size={14} aria-hidden="true" /></button><button type="button" aria-label={object.locked ? `Desbloquear ${objectLabel(object)}` : `Bloquear ${objectLabel(object)}`} onClick={() => updateObject(object.id, { locked: !object.locked } as Partial<EditorObject>)}><LockKeyhole size={14} aria-hidden="true" /></button></div>)}</div> : <p className="layers-empty">{text.noLayers}</p>}</div>
          <div className="editor-signature-panel"><strong>{text.signature}</strong><SignaturePad onChange={setSignatureDataUrl} /><button type="button" className="secondary-button" onClick={addSignature} disabled={!signatureDataUrl}>{text.insertSignature}</button></div>
          <div className="editor-status-card">{status === "exporting" ? <LoaderCircle className="spin" size={18} /> : <CheckCircle2 size={18} />}<span>{message || "Alterações locais e privadas."}</span></div>
        </aside>
      </div>
      <div className="editor-cache-bar"><ShieldCheck size={16} /><span>{text.cache}</span><Save size={16} /></div>
    </section>
  );
}
