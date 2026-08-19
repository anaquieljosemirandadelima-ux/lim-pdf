"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FilePlus2, FileText, ListOrdered, LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import { OutputActions } from "@/components/OutputActions";
import { downloadBytes, humanSize } from "@/lib/browser-files";
import { formatFileSizeLimit, getFileSizeGuidance, isFileWithinLimit, isPdfFile, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";
import { addBookmarks, type BookmarkDraft } from "@/lib/pro-pdf-engines";
import type { ProToolDefinition } from "@/lib/pro-tools";

type State = { type: "idle" | "processing" | "success" | "error"; message?: string };

export function ProNavigationWorkspace({ tool }: { tool: ProToolDefinition }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>({ type: "idle" });
  const [title, setTitle] = useState("Capítulo 1");
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState(0);
  const [bookmarks, setBookmarks] = useState<BookmarkDraft[]>([]);

  function selectFile(selected: File | null) {
    if (!selected) return;
    if (!isPdfFile(selected)) { setState({ type: "error", message: "Selecione um arquivo PDF." }); return; }
    if (!isFileWithinLimit(selected, MAX_LOCAL_PDF_BYTES)) { setState({ type: "error", message: `O arquivo ultrapassa ${formatFileSizeLimit()}.` }); return; }
    setFile(selected); setState({ type: "idle" }); setBookmarks([]);
  }

  function clearFile() {
    setFile(null); setBookmarks([]); setState({ type: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  function addBookmark() {
    if (!title.trim()) return;
    setBookmarks((current) => [...current, { title: title.trim(), page, level }]);
    setTitle(`Capítulo ${bookmarks.length + 2}`);
  }

  async function process() {
    if (!file || !bookmarks.length || state.type === "processing") return;
    setState({ type: "processing", message: "Criando estrutura de marcadores…" });
    try {
      const result = await addBookmarks(file, bookmarks);
      downloadBytes(result.bytes, result.filename);
      setState({ type: "success", message: "Marcadores adicionados. O resultado está pronto para imprimir ou baixar." });
    } catch (error) {
      setState({ type: "error", message: error instanceof Error ? error.message : "Não foi possível criar os marcadores." });
    }
  }

  return <section className="workspace pro-pdf-workspace pro-navigation-workspace">
    <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0] || null); }}>
      <span className="drop-icon"><UploadCloud size={31} /></span><strong>Selecione seu PDF</strong><span>Monte uma navegação por capítulos sem desenhar texto na página.</span>
      <button className="primary-button" type="button" onClick={() => { if (inputRef.current) { inputRef.current.value = ""; inputRef.current.click(); } }}><FileText size={18} /> Escolher PDF</button>
      <input ref={inputRef} type="file" accept={tool.accept} hidden onChange={(event) => selectFile(event.target.files?.[0] || null)} />
      <small>Até {formatFileSizeLimit()} por arquivo · navegação adicionada localmente</small>
    </div>

    {file && getFileSizeGuidance(file).tier !== "standard" ? <div className="large-file-notice" role="status"><FileText size={16} /><span><strong>Arquivo grande</strong><small>{getFileSizeGuidance(file).message} A criação de marcadores será exportada localmente.</small></span></div> : null}

    {file ? <div className="selected-files pro-selected-files"><div className="selected-file-row"><FileText size={17} /><span><strong>{file.name}</strong><small>{humanSize(file.size)} · {bookmarks.length} marcador(es) preparado(s)</small></span><button type="button" aria-label="Remover arquivo" onClick={clearFile}><Trash2 size={15} /></button></div></div> : null}

    <div className="tool-options pro-tool-options">
      <div className="pro-option-grid three"><label><span>Título</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label><span>Página</span><input type="number" min={1} value={page} onChange={(event) => setPage(Number(event.target.value) || 1)} /></label><label><span>Nível</span><select value={level} onChange={(event) => setLevel(Number(event.target.value))}><option value={0}>Principal</option><option value={1}>Subitem</option><option value={2}>Subitem nível 2</option></select></label></div>
      <button className="secondary-button" type="button" onClick={addBookmark}><FilePlus2 size={16} /> Adicionar marcador</button>
      {bookmarks.length ? <div className="pro-report"><strong>Estrutura</strong>{bookmarks.map((bookmark, index) => <span key={`${bookmark.title}-${index}`} style={{ paddingLeft: `${(bookmark.level || 0) * 14}px` }}><ListOrdered size={14} /> {bookmark.title} · pág. {bookmark.page}<button type="button" aria-label={`Excluir ${bookmark.title}`} onClick={() => setBookmarks((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={13} /></button></span>)}</div> : null}
    </div>

    <button className="process-button" type="button" disabled={!file || !bookmarks.length || state.type === "processing"} onClick={() => void process()}>{state.type === "processing" ? <><LoaderCircle className="spin" size={18} /> {state.message}</> : <>Criar marcadores</>}</button>
    {state.type === "success" ? <div className="status-message success"><CheckCircle2 size={18} /><span>{state.message}</span></div> : null}
    {state.type === "error" ? <div className="status-message error"><span>{state.message}</span></div> : null}
    <OutputActions />
  </section>;
}
