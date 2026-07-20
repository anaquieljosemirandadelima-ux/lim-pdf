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
  width: number;
  height: number;
  dataUrl: string;
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

function objectToCss(object: EditorObject) {
  return {
    left: object.x * PREVIEW_SCALE,
    top: `calc(100% - ${(object.y + object.height) * PREVIEW_SCALE}px)`,
    width: object.width * PREVIEW_SCALE,
    height: object.height * PREVIEW_SCALE,
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
  const [objects, setObjects] = useState<EditorObject[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [message, setMessage] = useState("");
  const [undoStack, setUndoStack] = useState<EditorObject[][]>([]);
  const [redoStack, setRedoStack] = useState<EditorObject[][]>([]);

  const page = pages[currentPage];
  const selectedObject = useMemo(
    () => objects.find((item) => item.id === selectedObjectId) || null,
    [objects, selectedObjectId],
  );
  const currentPageObjects = useMemo(
    () => objects.filter((item) => item.pageIndex === currentPage).sort((a, b) => a.zIndex - b.zIndex),
    [objects, currentPage],
  );

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

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
          setObjects(nextObjects.map((object) => clampObject(object, nextPages[object.pageIndex])));
          setCurrentPage(0);
          setSelectedObjectId(null);
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
  }, [file, restored]);

  const applyObjects = useCallback((updater: (current: EditorObject[]) => EditorObject[], selectId?: string | null) => {
    setObjects((current) => {
      const before = cloneObjects(current);
      const after = updater(current).map((object) => clampObject(object, pages[object.pageIndex]));
      if (!objectsEqual(before, after)) {
        setUndoStack((stack) => pushLimited(stack, before));
        setRedoStack([]);
      }
      return after;
    });
    if (selectId !== undefined) setSelectedObjectId(selectId);
  }, [pages]);

  function updateObject(objectId: string, patch: Partial<EditorObject>) {
    applyObjects((current) => current.map((object) => object.id === objectId ? { ...object, ...patch } as EditorObject : object));
  }

  function undo() {
    setUndoStack((stack) => {
      const previous = stack.at(-1);
      if (!previous) return stack;
      setRedoStack((redo) => pushLimited(redo, cloneObjects(objectsRef.current)));
      setObjects(cloneObjects(previous));
      setSelectedObjectId(null);
      return stack.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack((stack) => {
      const next = stack.at(-1);
      if (!next) return stack;
      setUndoStack((undoItems) => pushLimited(undoItems, cloneObjects(objectsRef.current)));
      setObjects(cloneObjects(next));
      setSelectedObjectId(null);
      return stack.slice(0, -1);
    });
  }

  function addText() {
    if (!page) return;
    const size = pagePdfSize(page);
    const fontSize = 18;
    const id = crypto.randomUUID();
    const object: TextObject = {
      id,
      kind: "text",
      pageIndex: currentPage,
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
      pageIndex: currentPage,
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

  const deleteSelected = useCallback(() => {
    if (!selectedObjectId) return;
    const selected = objects.find((item) => item.id === selectedObjectId);
    if (selected?.kind === "image") URL.revokeObjectURL(selected.previewUrl);
    applyObjects((current) => current.filter((item) => item.id !== selectedObjectId), null);
  }, [applyObjects, objects, selectedObjectId]);

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
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedObjectId(object.id);
    dragRef.current = {
      mode,
      objectId: object.id,
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
    const dx = (event.clientX - drag.startClientX) / PREVIEW_SCALE;
    const dy = (event.clientY - drag.startClientY) / PREVIEW_SCALE;
    const nextObject = drag.mode === "move"
      ? { ...drag.startObject, x: drag.startObject.x + dx, y: drag.startObject.y - dy }
      : {
          ...drag.startObject,
          width: drag.startObject.width + dx,
          height: drag.startObject.height + dy,
          y: drag.startObject.y - dy,
        };
    setObjects((current) => current.map((object) => object.id === drag.objectId ? clampObject(nextObject as EditorObject, pages[object.pageIndex]) : object));
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
    if (!selectedObjectId) return;
    applyObjects((current) => current.map((object) => object.id === selectedObjectId ? { ...object, x: object.x + deltaX, y: object.y + deltaY } : object));
  }, [applyObjects, selectedObjectId]);

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
      if (isTyping || !selectedObjectId) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      }
      if (event.key === "Escape") setSelectedObjectId(null);
      const step = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowLeft") { event.preventDefault(); nudgeSelected(-step, 0); }
      if (event.key === "ArrowRight") { event.preventDefault(); nudgeSelected(step, 0); }
      if (event.key === "ArrowUp") { event.preventDefault(); nudgeSelected(0, step); }
      if (event.key === "ArrowDown") { event.preventDefault(); nudgeSelected(0, -step); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, nudgeSelected, selectedObjectId, objects]);

  async function exportPdf() {
    if (!file) return;
    setStatus("exporting");
    setMessage("Aplicando as alterações e preparando o download...");
    try {
      const pdfLib = await getPdfLib();
      const document = await pdfLib.PDFDocument.load(await file.arrayBuffer());
      const font = await document.embedFont(pdfLib.StandardFonts.Helvetica);
      const sortedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex);
      for (const item of sortedObjects) {
        const pdfPage = document.getPage(item.pageIndex);
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
    setObjects([]);
    setCurrentPage(0);
    setSelectedObjectId(null);
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
        <div className="editor-top-actions"><button className="secondary-button" type="button" onClick={closeDocument}><Trash2 size={16} /> Fechar</button><button className="primary-button" type="button" onClick={exportPdf} disabled={status === "loading" || status === "exporting"}><Download size={17} /> Baixar PDF</button></div>
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
          {pages.map((item) => (
            <button className={item.pageIndex === currentPage ? "active" : ""} type="button" key={item.pageIndex} onClick={() => { setCurrentPage(item.pageIndex); setSelectedObjectId(null); }}>
              <img src={item.dataUrl} alt={`Miniatura da página ${item.pageIndex + 1}`} />
              <span>{item.pageIndex + 1}</span>
            </button>
          ))}
        </aside>
        <div className="editor-stage-wrap" onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedObjectId(null); }}>
          {status === "loading" ? <div className="editor-loading"><LoaderCircle className="spin" size={27} /><strong>Preparando editor</strong><p>{message}</p></div> : null}
          {page ? (
            <div className="editor-stage" style={{ width: page.width, height: page.height }}>
              <img src={page.dataUrl} alt={`Página ${currentPage + 1} do PDF`} />
              {currentPageObjects.map((object) => (
                <button
                  className={`editor-object editor-object-${object.kind} ${selectedObjectId === object.id ? "selected" : ""} ${object.kind === "text-replacement" && object.text !== object.originalText ? "changed" : ""}`}
                  type="button"
                  aria-label={`Selecionar ${getObjectLabel(object)}`}
                  title={getObjectLabel(object)}
                  key={object.id}
                  style={objectToCss(object)}
                  onPointerDown={(event) => beginDrag(event, object, "move")}
                  onPointerMove={continueDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  {object.kind === "image" ? <img src={object.previewUrl} alt="Imagem adicionada" draggable={false} /> : null}
                  {object.kind === "text" ? <span style={{ fontSize: object.fontSize * PREVIEW_SCALE }}>{object.text}</span> : null}
                  {object.kind === "text-replacement" && object.text !== object.originalText ? <span style={{ fontSize: object.fontSize * PREVIEW_SCALE }}>{object.text}</span> : null}
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
          {pages.length ? <div className="editor-page-navigation"><button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((value) => value - 1)}><ArrowLeft size={17} /></button><span>{currentPage + 1} / {pages.length}</span><button type="button" disabled={currentPage === pages.length - 1} onClick={() => setCurrentPage((value) => value + 1)}><ArrowRight size={17} /></button></div> : null}
        </div>
        <aside className="editor-properties">
          <h2>Propriedades</h2>
          {selectedObject ? (
            <div className="properties-panel">
              <div className="object-layer-row"><strong>{selectedObject.kind === "image" ? "Imagem" : selectedObject.kind === "text" ? "Texto" : "Texto detectado"}</strong><button type="button" onClick={deleteSelected}><Trash2 size={15} /> Excluir</button></div>
              {selectedObject.kind !== "image" ? <label><span>Conteúdo</span><textarea value={selectedObject.text} onChange={(event) => updateObject(selectedObject.id, { text: event.target.value } as Partial<EditorObject>)} /></label> : null}
              {selectedObject.kind !== "image" ? <label><span>Tamanho da fonte</span><input type="number" min="6" max="120" value={selectedObject.fontSize} onChange={(event) => updateObject(selectedObject.id, { fontSize: Number(event.target.value) || 12, height: Math.max(MIN_OBJECT_SIZE, (Number(event.target.value) || 12) * 1.35) } as Partial<EditorObject>)} /></label> : null}
              <div className="properties-grid">
                <label><span>X</span><input type="number" value={Math.round(selectedObject.x)} onChange={(event) => updateObject(selectedObject.id, { x: Number(event.target.value) || 0 } as Partial<EditorObject>)} /></label>
                <label><span>Y</span><input type="number" value={Math.round(selectedObject.y)} onChange={(event) => updateObject(selectedObject.id, { y: Number(event.target.value) || 0 } as Partial<EditorObject>)} /></label>
                <label><span>Largura</span><input type="number" min={MIN_OBJECT_SIZE} value={Math.round(selectedObject.width)} onChange={(event) => updateObject(selectedObject.id, { width: Number(event.target.value) || MIN_OBJECT_SIZE } as Partial<EditorObject>)} /></label>
                <label><span>Altura</span><input type="number" min={MIN_OBJECT_SIZE} value={Math.round(selectedObject.height)} onChange={(event) => updateObject(selectedObject.id, { height: Number(event.target.value) || MIN_OBJECT_SIZE } as Partial<EditorObject>)} /></label>
              </div>
              <div className="layer-controls">
                <button type="button" onClick={() => moveLayer("front")}><ArrowUp size={15} /> Frente</button>
                <button type="button" onClick={() => moveLayer("back")}><ArrowDown size={15} /> Fundo</button>
                <button type="button" onClick={() => moveLayer("up")}>Subir camada</button>
                <button type="button" onClick={() => moveLayer("down")}>Descer camada</button>
              </div>
              {selectedObject.kind === "text-replacement" ? <button type="button" className="secondary-button" onClick={() => updateObject(selectedObject.id, { text: selectedObject.originalText } as Partial<EditorObject>)}>Restaurar original</button> : null}
              <p>Atalhos: Ctrl+Z, Ctrl+Y, Delete, Esc e setas para mover. Use Shift + seta para mover 10 pontos.</p>
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
