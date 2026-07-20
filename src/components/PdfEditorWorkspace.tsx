"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Download,
  FileText,
  ImagePlus,
  LoaderCircle,
  MousePointer2,
  Redo2,
  Save,
  ShieldCheck,
  Trash2,
  Type,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadBytes } from "@/lib/browser-files";
import { loadPdfJsDocument } from "@/lib/pdf-render";
import { useTemporaryFiles } from "@/lib/use-temporary-files";

const MAX_FILE_SIZE = 60 * 1024 * 1024;
const PREVIEW_SCALE = 1.2;
const MIN_OBJECT_SIZE = 12;
const HISTORY_LIMIT = 60;

type PagePreview = {
  pageIndex: number;
  sourcePageIndex: number | null;
  width: number;
  height: number;
  dataUrl: string;
  isBlank?: boolean;
};

type EditorObjectKind = "text-replacement" | "text" | "image";

type EditorObjectBase = {
  id: string;
  kind: EditorObjectKind;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

type TextReplacementObject = EditorObjectBase & {
  kind: "text-replacement";
  originalText: string;
  text: string;
  fontSize: number;
};

type TextObject = EditorObjectBase & {
  kind: "text";
  text: string;
  fontSize: number;
};

type ImageObject = EditorObjectBase & {
  kind: "image";
  file: File;
  previewUrl: string;
};

type EditorObject = TextReplacementObject | TextObject | ImageObject;
type EditorStatus = "idle" | "loading" | "ready" | "exporting" | "error";
type DragMode = "move" | "resize";

type TextContentItem = {
  str: string;
  width: number;
  height: number;
  transform: number[];
};

type DragState = {
  mode: DragMode;
  objectId: string;
  objectIds: string[];
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startObject: EditorObject;
  startObjects: EditorObject[];
  changed: boolean;
};

async function getPdfLib() {
  return import("pdf-lib");
}

function isTextContentItem(item: unknown): item is TextContentItem {
  if (!item || typeof item !== "object") return false;
  const value = item as Partial<TextContentItem>;
  return typeof value.str === "string" && Array.isArray(value.transform);
}

function cloneObjects(objects: EditorObject[]) {
  return objects.map((object) => ({ ...object }));
}

function pushLimited<T>(items: T[], item: T) {
  return [...items.slice(Math.max(0, items.length - HISTORY_LIMIT + 1)), item];
}

function pagePdfSize(page: PagePreview) {
  return { width: page.width / PREVIEW_SCALE, height: page.height / PREVIEW_SCALE };
}

function createBlankPageDataUrl(width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}"><rect width="100%" height="100%" fill="#ffffff"/><rect x="1" y="1" width="${Math.max(0, Math.ceil(width) - 2)}" height="${Math.max(0, Math.ceil(height) - 2)}" fill="none" stroke="#eef2f6" stroke-width="2"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
  };
}

function objectsEqual(a: EditorObject[], b: EditorObject[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getObjectLabel(object: EditorObject) {
  if (object.kind === "image") return "Imagem";
  if (object.kind === "text") return object.text || "Texto";
  return object.text !== object.originalText ? object.text : object.originalText;
}

function objectToCss(object: EditorObject, zoom: number) {
  const scale = PREVIEW_SCALE * zoom;
  return {
    left: object.x * scale,
    top: `calc(100% - ${(object.y + object.height) * scale}px)`,
    width: object.width * scale,
    height: object.height * scale,
    zIndex: object.zIndex,
  };
}

export function PdfEditorWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const objectsRef = useRef<EditorObject[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] || null;
  const { restored, cached, clearCache } = useTemporaryFiles("tool:editar-pdf", files, setFiles);
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [pageSequence, setPageSequence] = useState<number[]>([]);
  const [objects, setObjects] = useState<EditorObject[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<EditorObject[]>([]);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [message, setMessage] = useState("");
  const [undoStack, setUndoStack] = useState<EditorObject[][]>([]);
  const [redoStack, setRedoStack] = useState<EditorObject[][]>([]);

  const currentPageId = pageSequence[currentPage];
  const page = pages.find((item) => item.pageIndex === currentPageId) || pages[0];
  const selectedObject = useMemo(
    () => objects.find((item) => item.id === selectedObjectId) || null,
    [objects, selectedObjectId],
  );
  const activeSelectionIds = useMemo(
    () => selectedObjectIds.length ? selectedObjectIds : selectedObjectId ? [selectedObjectId] : [],
    [selectedObjectId, selectedObjectIds],
  );
  const selectedObjects = useMemo(
    () => activeSelectionIds.flatMap((id) => {
      const object = objects.find((item) => item.id === id);
      return object ? [object] : [];
    }),
    [activeSelectionIds, objects],
  );
  const currentPageObjects = useMemo(
    () => page ? objects.filter((item) => item.pageIndex === page.pageIndex).sort((a, b) => a.zIndex - b.zIndex) : [],
    [objects, page],
  );

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  const selectObjects = useCallback((ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));
    setSelectedObjectIds(uniqueIds);
    setSelectedObjectId(uniqueIds.at(-1) || null);
  }, []);

  const clearSelection = useCallback(() => {
    selectObjects([]);
  }, [selectObjects]);

  const selectObject = useCallback((id: string, additive = false) => {
    if (!additive) {
      selectObjects([id]);
      return;
    }
    setSelectedObjectIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      setSelectedObjectId(next.at(-1) || null);
      return next;
    });
  }, [selectObjects]);

  const openFile = useCallback(async (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setStatus("error");
      setMessage("Selecione um arquivo PDF.");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setStatus("error");
      setMessage("O arquivo ultrapassa o limite recomendado de 60 MB.");
      return;
    }
    setFiles([selectedFile]);
  }, [setFiles]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    void (async () => {
      setStatus("loading");
      setMessage("Preparando o editor e criando o modelo de objetos...");
      try {
        const bytes = await file.arrayBuffer();
        const document = await loadPdfJsDocument(bytes.slice(0));
        const nextPages: PagePreview[] = [];
        const nextObjects: EditorObject[] = [];
        let nextZIndex = 1;
        try {
          for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
            if (cancelled) return;
            const pdfPage = await document.getPage(pageNumber);
            const viewport = pdfPage.getViewport({ scale: PREVIEW_SCALE });
            const canvas = window.document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext("2d", { alpha: false });
            if (!context) throw new Error("O navegador não conseguiu criar a visualização.");
            await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
            const textContent = await pdfPage.getTextContent();
            const textItems = textContent.items.filter(isTextContentItem) as TextContentItem[];
            textItems
              .filter((item) => item.str.trim())
              .forEach((item, index) => {
                const fontSize = Math.max(6, Math.hypot(item.transform[0], item.transform[1]));
                const width = Math.max(item.width, fontSize * 0.65);
                const height = Math.max(fontSize * 1.25, 9);
                nextObjects.push({
                  id: `text:${pageNumber - 1}:${index}`,
                  kind: "text-replacement",
                  pageIndex: pageNumber - 1,
                  originalText: item.str,
                  text: item.str,
                  x: Math.max(0, item.transform[4] - 1.5),
                  y: Math.max(0, item.transform[5] - fontSize * 0.25),
                  width,
                  height,
                  fontSize,
                  zIndex: nextZIndex,
                });
                nextZIndex += 1;
              });
            nextPages.push({
              pageIndex: pageNumber - 1,
              sourcePageIndex: pageNumber - 1,
              width: canvas.width,
              height: canvas.height,
              dataUrl: canvas.toDataURL("image/jpeg", 0.82),
            });
            pdfPage.cleanup();
          }
        } finally {
          await document.cleanup();
        }
        if (!cancelled) {
          setPages(nextPages);
          setPageSequence(nextPages.map((item) => item.pageIndex));
          setObjects(nextObjects.map((object) => clampObject(object, nextPages[object.pageIndex])));
          setCurrentPage(0);
          clearSelection();
          setUndoStack([]);
          setRedoStack([]);
          setStatus("ready");
          setMessage(restored ? "Sessão recuperada do cache temporário." : "PDF pronto para edição com objetos selecionáveis.");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Não foi possível abrir o PDF. Verifique se ele não está protegido ou corrompido.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [clearSelection, file, restored]);

  const applyObjects = useCallback((updater: (current: EditorObject[]) => EditorObject[], selectId?: string | string[] | null) => {
    setObjects((current) => {
      const before = cloneObjects(current);
      const after = updater(current).map((object) => clampObject(object, pages[object.pageIndex]));
      if (!objectsEqual(before, after)) {
        setUndoStack((stack) => pushLimited(stack, before));
        setRedoStack([]);
      }
      return after;
    });
    if (selectId !== undefined) selectObjects(Array.isArray(selectId) ? selectId : selectId ? [selectId] : []);
  }, [pages, selectObjects]);

  function updateObject(objectId: string, patch: Partial<EditorObject>) {
    applyObjects((current) => current.map((object) => object.id === objectId ? { ...object, ...patch } as EditorObject : object));
  }

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
      setUndoStack((undoItems) => pushLimited(undoItems, cloneObjects(objectsRef.current)));
      setObjects(cloneObjects(next));
      clearSelection();
      return stack.slice(0, -1);
    });
  }, [clearSelection]);

  function addText() {
    if (!page) return;
    const size = pagePdfSize(page);
    const fontSize = 18;
    const id = crypto.randomUUID();
    const object: TextObject = {
      id,
      kind: "text",
      pageIndex: page.pageIndex,
      text: "Novo texto",
      x: Math.max(20, size.width * 0.12),
      y: Math.max(20, size.height * 0.78),
      width: 150,
      height: fontSize * 1.35,
      fontSize,
      zIndex: Math.max(0, ...objects.map((item) => item.zIndex)) + 1,
    };
    applyObjects((current) => [...current, object], id);
  }

  function addImage(fileToAdd: File) {
    if (!page || !["image/jpeg", "image/png"].includes(fileToAdd.type)) return;
    const id = crypto.randomUUID();
    const object: ImageObject = {
      id,
      kind: "image",
      pageIndex: page.pageIndex,
      file: fileToAdd,
      previewUrl: URL.createObjectURL(fileToAdd),
      x: 70,
      y: 70,
      width: 180,
      height: 120,
      zIndex: Math.max(0, ...objects.map((item) => item.zIndex)) + 1,
    };
    applyObjects((current) => [...current, object], id);
  }

  const copySelected = useCallback(() => {
    if (!selectedObjects.length) return;
    setClipboard(cloneObjects(selectedObjects));
    setMessage(`${selectedObjects.length} objeto(s) copiado(s).`);
  }, [selectedObjects]);

  const duplicateSelected = useCallback(() => {
    if (!selectedObjects.length) return;
    const maxZ = Math.max(0, ...objects.map((item) => item.zIndex));
    const copies = selectedObjects.map((object, index) => ({
      ...object,
      id: crypto.randomUUID(),
      x: object.x + 14,
      y: object.y - 14,
      zIndex: maxZ + index + 1,
    })) as EditorObject[];
    applyObjects((current) => [...current, ...copies], copies.map((item) => item.id));
  }, [applyObjects, objects, selectedObjects]);

  const pasteObjects = useCallback(() => {
    if (!clipboard.length || !page) return;
    const maxZ = Math.max(0, ...objects.map((item) => item.zIndex));
    const copies = clipboard.map((object, index) => ({
      ...object,
      id: crypto.randomUUID(),
      pageIndex: page.pageIndex,
      x: object.x + 18,
      y: object.y - 18,
      zIndex: maxZ + index + 1,
    })) as EditorObject[];
    applyObjects((current) => [...current, ...copies], copies.map((item) => item.id));
  }, [applyObjects, clipboard, objects, page]);

  function moveCurrentPage(direction: -1 | 1) {
    setPageSequence((current) => {
      const targetIndex = currentPage + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[currentPage], next[targetIndex]] = [next[targetIndex], next[currentPage]];
      setCurrentPage(targetIndex);
      clearSelection();
      return next;
    });
  }

  function duplicateCurrentPage() {
    if (currentPageId === undefined) return;
    setPageSequence((current) => {
      const next = [...current];
      next.splice(currentPage + 1, 0, currentPageId);
      setCurrentPage(currentPage + 1);
      clearSelection();
      return next;
    });
  }

  function deleteCurrentPage() {
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
    const basePage = page || pages[0];
    if (!basePage) return;
    const nextPageIndex = Math.max(-1, ...pages.map((item) => item.pageIndex)) + 1;
    const blankPage: PagePreview = {
      pageIndex: nextPageIndex,
      sourcePageIndex: null,
      width: basePage.width,
      height: basePage.height,
      dataUrl: createBlankPageDataUrl(basePage.width, basePage.height),
      isBlank: true,
    };
    setPages((current) => [...current, blankPage]);
    setPageSequence((current) => {
      const next = [...current];
      next.splice(currentPage + 1, 0, nextPageIndex);
      return next;
    });
    setCurrentPage(currentPage + 1);
    clearSelection();
  }

  function alignSelected(mode: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    if (selectedObjects.length < 2) return;
    const selectedSet = new Set(activeSelectionIds);
    const left = Math.min(...selectedObjects.map((item) => item.x));
    const right = Math.max(...selectedObjects.map((item) => item.x + item.width));
    const bottom = Math.min(...selectedObjects.map((item) => item.y));
    const top = Math.max(...selectedObjects.map((item) => item.y + item.height));
    const centerX = (left + right) / 2;
    const centerY = (bottom + top) / 2;
    applyObjects((current) => current.map((object) => {
      if (!selectedSet.has(object.id)) return object;
      if (mode === "left") return { ...object, x: left };
      if (mode === "right") return { ...object, x: right - object.width };
      if (mode === "center") return { ...object, x: centerX - object.width / 2 };
      if (mode === "bottom") return { ...object, y: bottom };
      if (mode === "top") return { ...object, y: top - object.height };
      return { ...object, y: centerY - object.height / 2 };
    }));
  }

  function distributeSelected(axis: "horizontal" | "vertical") {
    if (selectedObjects.length < 3) return;
    const ordered = [...selectedObjects].sort((a, b) => axis === "horizontal" ? a.x - b.x : a.y - b.y);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const firstCenter = axis === "horizontal" ? first.x + first.width / 2 : first.y + first.height / 2;
    const lastCenter = axis === "horizontal" ? last.x + last.width / 2 : last.y + last.height / 2;
    const gap = (lastCenter - firstCenter) / (ordered.length - 1);
    const nextPositions = new Map<string, number>();
    ordered.forEach((object, index) => nextPositions.set(object.id, firstCenter + gap * index));
    applyObjects((current) => current.map((object) => {
      const center = nextPositions.get(object.id);
      if (center === undefined) return object;
      return axis === "horizontal" ? { ...object, x: center - object.width / 2 } : { ...object, y: center - object.height / 2 };
    }));
  }

  const deleteSelected = useCallback(() => {
    if (!activeSelectionIds.length) return;
    const selectedSet = new Set(activeSelectionIds);
    objects.forEach((item) => {
      if (selectedSet.has(item.id) && item.kind === "image") URL.revokeObjectURL(item.previewUrl);
    });
    applyObjects((current) => current.filter((item) => !selectedSet.has(item.id)), null);
  }, [activeSelectionIds, applyObjects, objects]);

  function moveLayer(direction: "front" | "back" | "up" | "down") {
    if (!selectedObject) return;
    const samePage = objects.filter((item) => item.pageIndex === selectedObject.pageIndex).sort((a, b) => a.zIndex - b.zIndex);
    const zIndexes = samePage.map((item) => item.zIndex);
    const currentIndex = samePage.findIndex((item) => item.id === selectedObject.id);
    if (currentIndex === -1) return;
    let targetZ = selectedObject.zIndex;
    if (direction === "front") targetZ = Math.max(...zIndexes) + 1;
    if (direction === "back") targetZ = Math.min(...zIndexes) - 1;
    if (direction === "up" && samePage[currentIndex + 1]) targetZ = samePage[currentIndex + 1].zIndex + 0.5;
    if (direction === "down" && samePage[currentIndex - 1]) targetZ = samePage[currentIndex - 1].zIndex - 0.5;
    applyObjects((current) => current.map((object) => object.id === selectedObject.id ? { ...object, zIndex: targetZ } : object));
  }

  function beginDrag(event: React.PointerEvent<HTMLElement>, object: EditorObject, mode: DragMode) {
    event.preventDefault();
    event.stopPropagation();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    if (additive && mode === "move") {
      selectObject(object.id, true);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const dragIds = activeSelectionIds.includes(object.id) ? activeSelectionIds : [object.id];
    selectObjects(dragIds);
    dragRef.current = {
      mode,
      objectId: object.id,
      objectIds: mode === "move" ? dragIds : [object.id],
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startObject: { ...object },
      startObjects: cloneObjects(objectsRef.current),
      changed: false,
    };
  }

  function continueDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = (event.clientX - drag.startClientX) / (PREVIEW_SCALE * zoom);
    const dy = (event.clientY - drag.startClientY) / (PREVIEW_SCALE * zoom);
    const nextObject = drag.mode === "move"
      ? { ...drag.startObject, x: drag.startObject.x + dx, y: drag.startObject.y - dy }
      : {
          ...drag.startObject,
          width: drag.startObject.width + dx,
          height: drag.startObject.height + dy,
          y: drag.startObject.y - dy,
        };
    setObjects((current) => current.map((object) => {
      if (drag.mode === "resize") return object.id === drag.objectId ? clampObject(nextObject as EditorObject, pages[object.pageIndex]) : object;
      if (!drag.objectIds.includes(object.id)) return object;
      const start = drag.startObjects.find((item) => item.id === object.id) || object;
      return clampObject({ ...object, x: start.x + dx, y: start.y - dy }, pages[object.pageIndex]);
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

  const nudgeSelected = useCallback((deltaX: number, deltaY: number) => {
    if (!activeSelectionIds.length) return;
    const selectedSet = new Set(activeSelectionIds);
    applyObjects((current) => current.map((object) => selectedSet.has(object.id) ? { ...object, x: object.x + deltaX, y: object.y + deltaY } : object));
  }, [activeSelectionIds, applyObjects]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT" || target?.isContentEditable;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if ((mod && event.key.toLowerCase() === "y") || (mod && event.shiftKey && event.key.toLowerCase() === "z")) {
        event.preventDefault();
        redo();
        return;
      }
      if (!isTyping && mod && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectObjects(currentPageObjects.map((object) => object.id));
        return;
      }
      if (!isTyping && mod && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelected();
        return;
      }
      if (!isTyping && mod && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteObjects();
        return;
      }
      if (!isTyping && mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (isTyping || !activeSelectionIds.length) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      }
      if (event.key === "Escape") clearSelection();
      const step = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowLeft") { event.preventDefault(); nudgeSelected(-step, 0); }
      if (event.key === "ArrowRight") { event.preventDefault(); nudgeSelected(step, 0); }
      if (event.key === "ArrowUp") { event.preventDefault(); nudgeSelected(0, step); }
      if (event.key === "ArrowDown") { event.preventDefault(); nudgeSelected(0, -step); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSelectionIds.length, clearSelection, clipboard, copySelected, currentPageObjects, deleteSelected, duplicateSelected, nudgeSelected, objects, pasteObjects, redo, selectObjects, selectedObjects, undo]);

  async function exportPdf() {
    if (!file) return;
    setStatus("exporting");
    setMessage("Aplicando as alterações e preparando o download...");
    try {
      const pdfLib = await getPdfLib();
      const sourceDocument = await pdfLib.PDFDocument.load(await file.arrayBuffer());
      const document = await pdfLib.PDFDocument.create();
      const font = await document.embedFont(pdfLib.StandardFonts.Helvetica);
      const sortedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex);
      for (const pageId of pageSequence) {
        const preview = pages.find((item) => item.pageIndex === pageId);
        if (!preview) continue;
        let pdfPage;
        if (preview.sourcePageIndex === null || preview.isBlank) {
          const size = pagePdfSize(preview);
          pdfPage = document.addPage([size.width, size.height]);
        } else {
          const [copiedPage] = await document.copyPages(sourceDocument, [preview.sourcePageIndex]);
          pdfPage = document.addPage(copiedPage);
        }
        for (const item of sortedObjects.filter((object) => object.pageIndex === preview.pageIndex)) {
          if (item.kind === "text-replacement") {
            if (item.text === item.originalText) continue;
            pdfPage.drawRectangle({
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              color: pdfLib.rgb(1, 1, 1),
            });
            if (item.text.trim()) {
              pdfPage.drawText(item.text, {
                x: item.x + 1.5,
                y: item.y + Math.max(1, item.height * 0.18),
                size: Math.max(6, Math.min(72, item.fontSize)),
                font,
                color: pdfLib.rgb(0.05, 0.08, 0.15),
                maxWidth: Math.max(20, pdfPage.getWidth() - item.x - 18),
              });
            }
          }
          if (item.kind === "text") {
            pdfPage.drawText(item.text, {
              x: item.x,
              y: item.y,
              size: Math.max(6, Math.min(120, item.fontSize)),
              font,
              color: pdfLib.rgb(0.05, 0.08, 0.15),
              maxWidth: item.width,
            });
          }
          if (item.kind === "image") {
            const bytes = await item.file.arrayBuffer();
            const image = item.file.type === "image/png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
            pdfPage.drawImage(image, { x: item.x, y: item.y, width: item.width, height: item.height || item.width * (image.height / image.width) });
          }
        }
      }
      const output = await document.save({ useObjectStreams: true });
      downloadBytes(output, `${file.name.replace(/\.pdf$/i, "")}-editado-lim-pdf.pdf`);
      setStatus("ready");
      setMessage("PDF editado. O download foi iniciado.");
    } catch {
      setStatus("error");
      setMessage("Não foi possível exportar as alterações deste PDF.");
    }
  }

  function closeDocument() {
    objects.forEach((item) => {
      if (item.kind === "image") URL.revokeObjectURL(item.previewUrl);
    });
    setFiles([]);
    setPages([]);
    setPageSequence([]);
    setObjects([]);
    setCurrentPage(0);
    clearSelection();
    setUndoStack([]);
    setRedoStack([]);
    clearCache();
  }

  if (!file) {
    return (
      <section className="editor-upload-card">
        <span className="editor-upload-icon"><UploadCloud size={31} /></span>
        <h2>Abra o PDF que deseja editar</h2>
        <p>O arquivo ficará armazenado temporariamente no navegador para evitar perda durante o trabalho.</p>
        <button className="primary-button large-button" type="button" onClick={() => fileInputRef.current?.click()}><FileText size={18} /> Selecionar PDF</button>
        <input ref={fileInputRef} type="file" accept="application/pdf" hidden onChange={(event) => event.target.files?.[0] && openFile(event.target.files[0])} />
        <div className="editor-upload-security"><ShieldCheck size={17} /> Sem upload para o LIM PDF</div>
      </section>
    );
  }

  return (
    <section className="pdf-editor-shell">
      <div className="editor-topbar">
        <div className="editor-file-name"><FileText size={19} /><span><strong>{file.name}</strong><small>{cached ? "Salvo temporariamente no navegador" : "Cache local indisponível para este tamanho"}</small></span></div>
        <div className="editor-history"><button type="button" onClick={undo} disabled={!undoStack.length} title="Desfazer (Ctrl+Z)"><Undo2 size={17} /></button><button type="button" onClick={redo} disabled={!redoStack.length} title="Refazer (Ctrl+Y)"><Redo2 size={17} /></button></div>
        <div className="editor-top-actions"><div className="editor-zoom-controls"><button type="button" onClick={() => setZoom((value) => Math.max(.5, Number((value - .1).toFixed(2))))}>-</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(2, Number((value + .1).toFixed(2))))}>+</button></div><button className="secondary-button" type="button" onClick={closeDocument}><Trash2 size={16} /> Fechar</button><button className="primary-button" type="button" onClick={exportPdf} disabled={status === "loading" || status === "exporting"}><Download size={17} /> Baixar PDF</button></div>
      </div>
      <div className="editor-body">
        <aside className="editor-tools">
          <button className="active" type="button"><MousePointer2 size={20} /><span>Selecionar</span></button>
          <button type="button" onClick={addText}><Type size={20} /><span>Adicionar texto</span></button>
          <button type="button" onClick={() => imageInputRef.current?.click()}><ImagePlus size={20} /><span>Adicionar imagem</span></button>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={(event) => event.target.files?.[0] && addImage(event.target.files[0])} />
        </aside>
        <aside className="editor-pages">
          <h2>Páginas</h2>
          <div className="page-production-controls">
            <button type="button" onClick={() => moveCurrentPage(-1)} disabled={currentPage === 0} title="Mover página para cima"><ArrowUp size={14} /></button>
            <button type="button" onClick={() => moveCurrentPage(1)} disabled={currentPage === pageSequence.length - 1} title="Mover página para baixo"><ArrowDown size={14} /></button>
            <button type="button" onClick={duplicateCurrentPage} title="Duplicar página">Duplicar</button>
            <button type="button" onClick={insertBlankPage} title="Inserir página em branco">Em branco</button>
            <button type="button" onClick={deleteCurrentPage} disabled={pageSequence.length <= 1} title="Excluir página">Excluir</button>
          </div>
          {pageSequence.map((pageId, sequenceIndex) => {
            const item = pages.find((candidate) => candidate.pageIndex === pageId);
            if (!item) return null;
            return (
            <button className={sequenceIndex === currentPage ? "active" : ""} type="button" key={`${pageId}:${sequenceIndex}`} onClick={() => { setCurrentPage(sequenceIndex); clearSelection(); }}>
              <img src={item.dataUrl} alt={`Miniatura da página ${sequenceIndex + 1}`} />
              <span>{sequenceIndex + 1}</span>
              {item.isBlank ? <small>Em branco</small> : null}
            </button>
            );
          })}
        </aside>
        <div className="editor-stage-wrap" onPointerDown={(event) => { if (event.target === event.currentTarget) clearSelection(); }}>
          {status === "loading" ? <div className="editor-loading"><LoaderCircle className="spin" size={27} /><strong>Preparando editor</strong><p>{message}</p></div> : null}
          {page ? (
            <div className="editor-stage" style={{ width: page.width * zoom, height: page.height * zoom }}>
              <img src={page.dataUrl} alt={`Página ${currentPage + 1} do PDF`} />
              {currentPageObjects.map((object) => (
                <button
                  className={`editor-object editor-object-${object.kind} ${activeSelectionIds.includes(object.id) ? "selected" : ""} ${object.kind === "text-replacement" && object.text !== object.originalText ? "changed" : ""}`}
                  type="button"
                  aria-label={`Selecionar ${getObjectLabel(object)}`}
                  title={getObjectLabel(object)}
                  key={object.id}
                  style={objectToCss(object, zoom)}
                  onPointerDown={(event) => beginDrag(event, object, "move")}
                  onPointerMove={continueDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  {object.kind === "image" ? <img src={object.previewUrl} alt="Imagem adicionada" draggable={false} /> : null}
                  {object.kind === "text" ? <span style={{ fontSize: object.fontSize * PREVIEW_SCALE * zoom }}>{object.text}</span> : null}
                  {object.kind === "text-replacement" && object.text !== object.originalText ? <span style={{ fontSize: object.fontSize * PREVIEW_SCALE * zoom }}>{object.text}</span> : null}
                  {selectedObjectId === object.id ? (
                    <span
                      className="editor-resize-handle"
                      role="presentation"
                      onPointerDown={(event) => beginDrag(event, object, "resize")}
                      onPointerMove={continueDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          {pageSequence.length ? <div className="editor-page-navigation"><button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((value) => value - 1)}><ArrowLeft size={17} /></button><span>{currentPage + 1} / {pageSequence.length}</span><button type="button" disabled={currentPage === pageSequence.length - 1} onClick={() => setCurrentPage((value) => value + 1)}><ArrowRight size={17} /></button></div> : null}
        </div>
        <aside className="editor-properties">
          <h2>Propriedades</h2>
          {selectedObject ? (
            <div className="properties-panel">
              <div className="object-layer-row"><strong>{selectedObjects.length > 1 ? `${selectedObjects.length} objetos selecionados` : selectedObject.kind === "image" ? "Imagem" : selectedObject.kind === "text" ? "Texto" : "Texto detectado"}</strong><button type="button" onClick={deleteSelected}><Trash2 size={15} /> Excluir</button></div>
              <div className="selection-actions">
                <button type="button" onClick={copySelected}>Copiar</button>
                <button type="button" onClick={duplicateSelected}>Duplicar</button>
                <button type="button" onClick={pasteObjects} disabled={!clipboard.length}>Colar</button>
              </div>
              {selectedObjects.length === 1 && selectedObject.kind !== "image" ? <label><span>Conteúdo</span><textarea value={selectedObject.text} onChange={(event) => updateObject(selectedObject.id, { text: event.target.value } as Partial<EditorObject>)} /></label> : null}
              {selectedObjects.length === 1 && selectedObject.kind !== "image" ? <label><span>Tamanho da fonte</span><input type="number" min="6" max="120" value={selectedObject.fontSize} onChange={(event) => updateObject(selectedObject.id, { fontSize: Number(event.target.value) || 12, height: Math.max(MIN_OBJECT_SIZE, (Number(event.target.value) || 12) * 1.35) } as Partial<EditorObject>)} /></label> : null}
              {selectedObjects.length === 1 ? (
                <div className="properties-grid">
                  <label><span>X</span><input type="number" value={Math.round(selectedObject.x)} onChange={(event) => updateObject(selectedObject.id, { x: Number(event.target.value) || 0 } as Partial<EditorObject>)} /></label>
                  <label><span>Y</span><input type="number" value={Math.round(selectedObject.y)} onChange={(event) => updateObject(selectedObject.id, { y: Number(event.target.value) || 0 } as Partial<EditorObject>)} /></label>
                  <label><span>Largura</span><input type="number" min={MIN_OBJECT_SIZE} value={Math.round(selectedObject.width)} onChange={(event) => updateObject(selectedObject.id, { width: Number(event.target.value) || MIN_OBJECT_SIZE } as Partial<EditorObject>)} /></label>
                  <label><span>Altura</span><input type="number" min={MIN_OBJECT_SIZE} value={Math.round(selectedObject.height)} onChange={(event) => updateObject(selectedObject.id, { height: Number(event.target.value) || MIN_OBJECT_SIZE } as Partial<EditorObject>)} /></label>
                </div>
              ) : null}
              {selectedObjects.length > 1 ? (
                <div className="alignment-controls">
                  <button type="button" onClick={() => alignSelected("left")}>Alinhar esq.</button>
                  <button type="button" onClick={() => alignSelected("center")}>Centro H</button>
                  <button type="button" onClick={() => alignSelected("right")}>Alinhar dir.</button>
                  <button type="button" onClick={() => alignSelected("top")}>Topo</button>
                  <button type="button" onClick={() => alignSelected("middle")}>Centro V</button>
                  <button type="button" onClick={() => alignSelected("bottom")}>Base</button>
                  <button type="button" onClick={() => distributeSelected("horizontal")} disabled={selectedObjects.length < 3}>Distribuir H</button>
                  <button type="button" onClick={() => distributeSelected("vertical")} disabled={selectedObjects.length < 3}>Distribuir V</button>
                </div>
              ) : null}
              <div className="layer-controls">
                <button type="button" onClick={() => moveLayer("front")}><ArrowUp size={15} /> Frente</button>
                <button type="button" onClick={() => moveLayer("back")}><ArrowDown size={15} /> Fundo</button>
                <button type="button" onClick={() => moveLayer("up")}>Subir camada</button>
                <button type="button" onClick={() => moveLayer("down")}>Descer camada</button>
              </div>
              {selectedObjects.length === 1 && selectedObject.kind === "text-replacement" ? <button type="button" className="secondary-button" onClick={() => updateObject(selectedObject.id, { text: selectedObject.originalText } as Partial<EditorObject>)}>Restaurar original</button> : null}
              <p>Atalhos: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+Z, Ctrl+Y, Delete, Esc e setas. Use Shift + seta para mover 10 pontos.</p>
            </div>
          ) : (
            <div className="empty-properties"><MousePointer2 size={26} /><strong>Selecione um objeto</strong><p>Clique em textos detectados, textos novos ou imagens para editar, mover, redimensionar ou excluir.</p></div>
          )}
          <div className="editor-status-card">
            {status === "exporting" ? <LoaderCircle className="spin" size={18} /> : <CheckCircle2 size={18} />}
            <span>{message || "Alterações locais e privadas."}</span>
          </div>
        </aside>
      </div>
      <div className="editor-cache-bar"><ShieldCheck size={16} /><span>Processamento local com cache temporário de até 4 horas. Nenhum documento é enviado ao LIM PDF.</span><Save size={16} /></div>
    </section>
  );
}
