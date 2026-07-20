"use client";

import {
  ArrowLeft,
  ArrowRight,
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

type TextBlock = {
  id: string;
  pageIndex: number;
  text: string;
  replacement: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
};

type PagePreview = {
  pageIndex: number;
  width: number;
  height: number;
  dataUrl: string;
  textBlocks: TextBlock[];
};

type AddedText = {
  id: string;
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
};

type AddedImage = {
  id: string;
  pageIndex: number;
  file: File;
  previewUrl: string;
  x: number;
  y: number;
  width: number;
};

type EditorStatus = "idle" | "loading" | "ready" | "exporting" | "error";

type TextContentItem = {
  str: string;
  width: number;
  height: number;
  transform: number[];
};

async function getPdfLib() {
  return import("pdf-lib");
}

function isTextContentItem(item: unknown): item is TextContentItem {
  if (!item || typeof item !== "object") return false;
  const value = item as Partial<TextContentItem>;
  return typeof value.str === "string" && Array.isArray(value.transform);
}

export function PdfEditorWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] || null;
  const { restored, cached, clearCache } = useTemporaryFiles("tool:editar-pdf", files, setFiles);
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [addedTexts, setAddedTexts] = useState<AddedText[]>([]);
  const [addedImages, setAddedImages] = useState<AddedImage[]>([]);
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [message, setMessage] = useState("");

  const page = pages[currentPage];
  const selectedBlock = useMemo(
    () => pages.flatMap((item) => item.textBlocks).find((item) => item.id === selectedBlockId) || null,
    [pages, selectedBlockId],
  );

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
      setMessage("Preparando o editor e identificando os textos...");
      try {
        const bytes = await file.arrayBuffer();
        const document = await loadPdfJsDocument(bytes.slice(0));
        const nextPages: PagePreview[] = [];
        try {
          for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
            if (cancelled) return;
            const pdfPage = await document.getPage(pageNumber);
            const previewScale = 1.2;
            const viewport = pdfPage.getViewport({ scale: previewScale });
            const canvas = window.document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext("2d", { alpha: false });
            if (!context) throw new Error("O navegador não conseguiu criar a visualização.");
            await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
            const textContent = await pdfPage.getTextContent();
            const textItems = textContent.items.filter(isTextContentItem) as TextContentItem[];
            const textBlocks = textItems
              .filter((item) => item.str.trim())
              .map<TextBlock>((item, index) => {
                const transformed = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
                const fontSize = Math.max(6, Math.hypot(item.transform[0], item.transform[1]));
                const screenWidth = Math.max(8, item.width * previewScale);
                const screenHeight = Math.max(10, fontSize * previewScale * 1.2);
                return {
                  id: `${pageNumber - 1}:${index}`,
                  pageIndex: pageNumber - 1,
                  text: item.str,
                  replacement: item.str,
                  x: item.transform[4],
                  y: item.transform[5],
                  width: Math.max(item.width, fontSize * 0.5),
                  fontSize,
                  screenX: transformed[0],
                  screenY: transformed[1] - screenHeight,
                  screenWidth,
                  screenHeight,
                };
              });
            nextPages.push({
              pageIndex: pageNumber - 1,
              width: canvas.width,
              height: canvas.height,
              dataUrl: canvas.toDataURL("image/jpeg", 0.82),
              textBlocks,
            });
            pdfPage.cleanup();
          }
        } finally {
          await document.cleanup();
        }
        if (!cancelled) {
          setPages(nextPages);
          setCurrentPage(0);
          setSelectedBlockId(null);
          setStatus("ready");
          setMessage(restored ? "Sessão recuperada do cache temporário." : "PDF pronto para edição.");
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

  function updateSelectedText(value: string) {
    if (!selectedBlockId) return;
    setPages((current) => current.map((item) => ({
      ...item,
      textBlocks: item.textBlocks.map((block) => block.id === selectedBlockId ? { ...block, replacement: value } : block),
    })));
  }

  function addText() {
    if (!page) return;
    const fontSize = 18;
    setAddedTexts((current) => [...current, {
      id: crypto.randomUUID(),
      pageIndex: currentPage,
      text: "Novo texto",
      x: 60,
      y: Math.max(60, (page.height / 1.2) - 90),
      fontSize,
    }]);
  }

  function addImage(fileToAdd: File) {
    if (!page || !["image/jpeg", "image/png"].includes(fileToAdd.type)) return;
    setAddedImages((current) => [...current, {
      id: crypto.randomUUID(),
      pageIndex: currentPage,
      file: fileToAdd,
      previewUrl: URL.createObjectURL(fileToAdd),
      x: 70,
      y: 70,
      width: 180,
    }]);
  }

  async function exportPdf() {
    if (!file) return;
    setStatus("exporting");
    setMessage("Aplicando as alterações e preparando o download...");
    try {
      const pdfLib = await getPdfLib();
      const document = await pdfLib.PDFDocument.load(await file.arrayBuffer());
      const font = await document.embedFont(pdfLib.StandardFonts.Helvetica);
      for (const preview of pages) {
        const pdfPage = document.getPage(preview.pageIndex);
        for (const block of preview.textBlocks) {
          if (block.replacement === block.text) continue;
          const coverHeight = Math.max(block.fontSize * 1.25, 9);
          pdfPage.drawRectangle({
            x: Math.max(0, block.x - 1.5),
            y: Math.max(0, block.y - block.fontSize * 0.25),
            width: Math.min(pdfPage.getWidth() - block.x + 1.5, Math.max(block.width + 4, block.fontSize)),
            height: coverHeight,
            color: pdfLib.rgb(1, 1, 1),
          });
          if (block.replacement.trim()) {
            pdfPage.drawText(block.replacement, {
              x: block.x,
              y: block.y,
              size: Math.max(6, Math.min(72, block.fontSize)),
              font,
              color: pdfLib.rgb(0.05, 0.08, 0.15),
              maxWidth: Math.max(20, pdfPage.getWidth() - block.x - 18),
            });
          }
        }
      }
      for (const item of addedTexts) {
        const pdfPage = document.getPage(item.pageIndex);
        pdfPage.drawText(item.text, { x: item.x, y: item.y, size: item.fontSize, font, color: pdfLib.rgb(0.05, 0.08, 0.15) });
      }
      for (const item of addedImages) {
        const pdfPage = document.getPage(item.pageIndex);
        const bytes = await item.file.arrayBuffer();
        const image = item.file.type === "image/png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
        const height = item.width * (image.height / image.width);
        pdfPage.drawImage(image, { x: item.x, y: item.y, width: item.width, height });
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
    addedImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setFiles([]);
    setPages([]);
    setAddedTexts([]);
    setAddedImages([]);
    setSelectedBlockId(null);
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
        <div className="editor-history"><button type="button" disabled title="Desfazer"><Undo2 size={17} /></button><button type="button" disabled title="Refazer"><Redo2 size={17} /></button></div>
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
            <button className={item.pageIndex === currentPage ? "active" : ""} type="button" key={item.pageIndex} onClick={() => { setCurrentPage(item.pageIndex); setSelectedBlockId(null); }}>
              <img src={item.dataUrl} alt={`Miniatura da página ${item.pageIndex + 1}`} />
              <span>{item.pageIndex + 1}</span>
            </button>
          ))}
        </aside>
        <div className="editor-stage-wrap">
          {status === "loading" ? <div className="editor-loading"><LoaderCircle className="spin" size={27} /><strong>Preparando editor</strong><p>{message}</p></div> : null}
          {page ? (
            <div className="editor-stage" style={{ width: page.width, height: page.height }}>
              <img src={page.dataUrl} alt={`Página ${currentPage + 1} do PDF`} />
              {page.textBlocks.map((block) => (
                <button
                  className={`text-detection-box ${selectedBlockId === block.id ? "selected" : ""} ${block.replacement !== block.text ? "changed" : ""}`}
                  type="button"
                  aria-label={`Editar texto: ${block.text}`}
                  title={block.text}
                  key={block.id}
                  style={{ left: block.screenX, top: block.screenY, width: block.screenWidth, height: block.screenHeight }}
                  onClick={() => setSelectedBlockId(block.id)}
                />
              ))}
              {addedTexts.filter((item) => item.pageIndex === currentPage).map((item) => <div className="added-text-preview" key={item.id} style={{ left: item.x * 1.2, bottom: item.y * 1.2, fontSize: item.fontSize * 1.2 }}>{item.text}</div>)}
              {addedImages.filter((item) => item.pageIndex === currentPage).map((item) => <img className="added-image-preview" src={item.previewUrl} alt="Imagem adicionada" key={item.id} style={{ left: item.x * 1.2, bottom: item.y * 1.2, width: item.width * 1.2 }} />)}
            </div>
          ) : null}
          {pages.length ? <div className="editor-page-navigation"><button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((value) => value - 1)}><ArrowLeft size={17} /></button><span>{currentPage + 1} / {pages.length}</span><button type="button" disabled={currentPage === pages.length - 1} onClick={() => setCurrentPage((value) => value + 1)}><ArrowRight size={17} /></button></div> : null}
        </div>
        <aside className="editor-properties">
          <h2>Propriedades</h2>
          {selectedBlock ? (
            <div className="properties-panel">
              <label><span>Texto selecionado</span><textarea value={selectedBlock.replacement} onChange={(event) => updateSelectedText(event.target.value)} /></label>
              <p>A substituição cobre o texto detectado e escreve o novo conteúdo no mesmo local.</p>
              <button type="button" className="secondary-button" onClick={() => updateSelectedText(selectedBlock.text)}>Restaurar original</button>
            </div>
          ) : (
            <div className="empty-properties"><MousePointer2 size={26} /><strong>Selecione um texto</strong><p>Clique em um bloco destacado na página para editar.</p></div>
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
