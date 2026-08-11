"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Link2, ListTree, LoaderCircle, Plus, Trash2, UploadCloud } from "lucide-react";
import { downloadBytes, humanSize } from "@/lib/browser-files";
import { addBookmarks, addHyperlink, addInternalPageLink, removeAllHyperlinks, type BookmarkDraft } from "@/lib/pro-pdf-engines";
import type { ProToolDefinition } from "@/lib/pro-tools";

type State = { type: "idle" | "processing" | "success" | "error"; message?: string };

export function ProNavigationWorkspace({ tool }: { tool: ProToolDefinition }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>({ type: "idle" });
  const [mode, setMode] = useState<"url" | "page" | "remove">("url");
  const [url, setUrl] = useState("https://");
  const [page, setPage] = useState(1);
  const [targetPage, setTargetPage] = useState(1);
  const [x, setX] = useState(72);
  const [y, setY] = useState(72);
  const [width, setWidth] = useState(220);
  const [height, setHeight] = useState(36);
  const [bookmarkTitle, setBookmarkTitle] = useState("Capítulo 1");
  const [bookmarkPage, setBookmarkPage] = useState(1);
  const [bookmarkLevel, setBookmarkLevel] = useState(0);
  const [bookmarks, setBookmarks] = useState<BookmarkDraft[]>([]);

  function setSelected(selected: File | null) {
    if (!selected) return;
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) { setState({ type: "error", message: "Selecione um arquivo PDF." }); return; }
    if (selected.size > 80 * 1024 * 1024) { setState({ type: "error", message: "O arquivo ultrapassa 80 MB." }); return; }
    setFile(selected); setState({ type: "idle" });
  }

  async function process() {
    if (!file || state.type === "processing") return;
    setState({ type: "processing", message: "Aplicando estrutura de navegação…" });
    try {
      if (tool.slug === "links-pdf") {
        if (mode === "remove") {
          const result = await removeAllHyperlinks(file);
          downloadBytes(result.bytes, result.filename);
          setState({ type: "success", message: `${result.removed} hyperlink(s) removido(s). Download iniciado.` });
          return;
        }
        const result = mode === "url"
          ? await addHyperlink(file, { url, page, x, y, width, height })
          : await addInternalPageLink(file, { sourcePage: page, targetPage, x, y, width, height });
        downloadBytes(result.bytes, result.filename);
        setState({ type: "success", message: "Link nativo inserido. Download iniciado." });
        return;
      }
      if (!bookmarks.length) throw new Error("Adicione pelo menos um marcador.");
      const result = await addBookmarks(file, bookmarks);
      downloadBytes(result.bytes, result.filename);
      setState({ type: "success", message: `${bookmarks.length} marcador(es) criados com hierarquia. Download iniciado.` });
    } catch (error) {
      setState({ type: "error", message: error instanceof Error ? error.message : "Não foi possível processar o documento." });
    }
  }

  function addBookmark() {
    if (!bookmarkTitle.trim()) return;
    setBookmarks((current) => [...current, { title: bookmarkTitle.trim(), page: bookmarkPage, level: bookmarkLevel }]);
    setBookmarkTitle(`Seção ${bookmarks.length + 2}`);
  }

  return <section className="workspace pro-pdf-workspace pro-navigation-workspace">
    <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setSelected(event.dataTransfer.files[0] || null); }}>
      <span className="drop-icon"><UploadCloud size={31} /></span>
      <strong>Selecione seu PDF</strong><span>Links e marcadores são gravados como objetos nativos do formato PDF.</span>
      <button className="primary-button" type="button" onClick={() => inputRef.current?.click()}><FileText size={18} /> Escolher PDF</button>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => setSelected(event.target.files?.[0] || null)} />
    </div>

    {file ? <div className="selected-files pro-selected-files"><div className="selected-file-row"><FileText size={17} /><span><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span><button type="button" aria-label="Remover arquivo" onClick={() => setFile(null)}><Trash2 size={15} /></button></div></div> : null}

    <div className="tool-options pro-tool-options">
      {tool.slug === "links-pdf" ? <>
        <label><span>Ação</span><select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="url">Adicionar link para site</option><option value="page">Adicionar link para página interna</option><option value="remove">Remover todos os hyperlinks existentes</option></select></label>
        {mode !== "remove" ? <>
          {mode === "url" ? <label><span>Endereço</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://exemplo.com" /></label> : <label><span>Página de destino</span><input type="number" min={1} value={targetPage} onChange={(event) => setTargetPage(Number(event.target.value) || 1)} /></label>}
          <label><span>Página de origem</span><input type="number" min={1} value={page} onChange={(event) => setPage(Number(event.target.value) || 1)} /></label>
          <div className="pro-option-grid four"><label><span>X</span><input type="number" value={x} onChange={(event) => setX(Number(event.target.value) || 0)} /></label><label><span>Y</span><input type="number" value={y} onChange={(event) => setY(Number(event.target.value) || 0)} /></label><label><span>Largura</span><input type="number" min={8} value={width} onChange={(event) => setWidth(Number(event.target.value) || 8)} /></label><label><span>Altura</span><input type="number" min={8} value={height} onChange={(event) => setHeight(Number(event.target.value) || 8)} /></label></div>
          <small>As coordenadas usam pontos PDF, com origem no canto inferior esquerdo.</small>
        </> : <div className="pro-info-card"><Link2 size={17} /><span><strong>Limpeza de links</strong><small>Remove todas as annotations /Link das páginas sem rasterizar o documento.</small></span></div>}
      </> : <>
        <div className="pro-option-grid two"><label><span>Título</span><input value={bookmarkTitle} onChange={(event) => setBookmarkTitle(event.target.value)} /></label><label><span>Página</span><input type="number" min={1} value={bookmarkPage} onChange={(event) => setBookmarkPage(Number(event.target.value) || 1)} /></label></div>
        <label><span>Nível na árvore</span><select value={bookmarkLevel} onChange={(event) => setBookmarkLevel(Number(event.target.value))}><option value={0}>Principal</option><option value={1}>Subnível 1</option><option value={2}>Subnível 2</option><option value={3}>Subnível 3</option></select></label>
        <button type="button" className="secondary-button pro-add-button" onClick={addBookmark}><Plus size={15} /> Adicionar marcador</button>
        <div className="pro-chip-list">{bookmarks.map((bookmark, index) => <span key={`${bookmark.title}-${index}`} style={{ marginLeft: `${Math.min(3, bookmark.level || 0) * 10}px` }}><ListTree size={13} /> {bookmark.title} → pág. {bookmark.page}<button type="button" aria-label={`Remover ${bookmark.title}`} onClick={() => setBookmarks((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>)}</div>
      </>}
    </div>

    <button className="process-button" type="button" disabled={!file || state.type === "processing"} onClick={() => void process()}>{state.type === "processing" ? <><LoaderCircle className="spin" size={18} /> {state.message}</> : <>Processar agora</>}</button>
    {state.type === "success" ? <div className="status-message success"><CheckCircle2 size={18} /><span>{state.message}</span></div> : null}
    {state.type === "error" ? <div className="status-message error"><span>{state.message}</span></div> : null}
  </section>;
}
