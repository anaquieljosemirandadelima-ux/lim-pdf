"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ExternalLink, FileText, Layers3, LoaderCircle, Repeat2, Trash2, UploadCloud } from "lucide-react";
import { downloadBytes, humanSize } from "@/lib/browser-files";
import { addHyperlink, addInternalPageLink, editHyperlink, readHyperlinks, removeAllHyperlinks, removeHyperlink, type PdfHyperlinkInfo } from "@/lib/pro-pdf-engines";

type Mode = "add-url" | "add-page" | "edit" | "remove-one" | "remove-all";
type State = { type: "idle" | "loading" | "processing" | "success" | "error"; message?: string };

export function ProLinksWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [links, setLinks] = useState<PdfHyperlinkInfo[]>([]);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>("add-url");
  const [url, setUrl] = useState("https://");
  const [sourcePage, setSourcePage] = useState(1);
  const [targetPage, setTargetPage] = useState(1);
  const [x, setX] = useState(72); const [y, setY] = useState(72); const [width, setWidth] = useState(220); const [height, setHeight] = useState(36);
  const [state, setState] = useState<State>({ type: "idle" });

  async function loadLinks(selectedFile: File) {
    setState({ type: "loading", message: "Lendo hyperlinks existentes…" });
    try {
      const found = await readHyperlinks(selectedFile);
      setLinks(found); setSelected(0);
      setState({ type: "idle", message: found.length ? `${found.length} hyperlink(s) encontrado(s).` : "Nenhum hyperlink externo encontrado." });
    } catch {
      setLinks([]); setState({ type: "idle", message: "O PDF foi carregado; links incompatíveis podem não aparecer na lista." });
    }
  }

  async function selectFile(selectedFile: File | null) {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) { setState({ type: "error", message: "Selecione um arquivo PDF." }); return; }
    if (selectedFile.size > 80 * 1024 * 1024) { setState({ type: "error", message: "O arquivo ultrapassa 80 MB." }); return; }
    setFile(selectedFile); await loadLinks(selectedFile);
  }

  function clearFile() {
    setFile(null); setLinks([]); setSelected(0); setState({ type: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function process() {
    if (!file || state.type === "processing") return;
    setState({ type: "processing", message: "Atualizando hyperlinks…" });
    try {
      let result: { bytes: Uint8Array; filename: string };
      if (mode === "add-url") result = await addHyperlink(file, { url, page: sourcePage, x, y, width, height });
      else if (mode === "add-page") result = await addInternalPageLink(file, { sourcePage, targetPage, x, y, width, height });
      else if (mode === "remove-all") result = await removeAllHyperlinks(file);
      else {
        const item = links[selected];
        if (!item) throw new Error("Selecione um hyperlink existente.");
        result = mode === "edit" ? await editHyperlink(file, item.page, item.index, url) : await removeHyperlink(file, item.page, item.index);
      }
      downloadBytes(result.bytes, result.filename);
      setState({ type: "success", message: "Hyperlinks atualizados. O download foi iniciado." });
    } catch (error) {
      setState({ type: "error", message: error instanceof Error ? error.message : "Não foi possível alterar os hyperlinks." });
    }
  }

  const current = links[selected];
  const needsExisting = mode === "edit" || mode === "remove-one";
  return <section className="workspace pro-pdf-workspace pro-links-workspace">
    <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void selectFile(event.dataTransfer.files[0] || null); }}>
      <span className="drop-icon"><UploadCloud size={31} /></span><strong>Selecione seu PDF</strong><span>Crie, edite ou remova links sem transformar a página em imagem.</span>
      <button className="primary-button" type="button" onClick={() => { if (inputRef.current) { inputRef.current.value = ""; inputRef.current.click(); } }}><FileText size={18} /> Escolher PDF</button>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => void selectFile(event.target.files?.[0] || null)} />
    </div>

    {file ? <div className="selected-files pro-selected-files"><div className="selected-file-row"><FileText size={17} /><span><strong>{file.name}</strong><small>{humanSize(file.size)} · {links.length} link(s) detectado(s)</small></span><button type="button" aria-label="Remover arquivo" onClick={clearFile}><Trash2 size={15} /></button></div></div> : null}

    <div className="tool-options pro-tool-options">
      <label><span>Ação</span><select value={mode} onChange={(event) => setMode(event.target.value as Mode)}><option value="add-url">Adicionar link para site</option><option value="add-page">Adicionar link para página interna</option><option value="edit">Editar URL existente</option><option value="remove-one">Remover link selecionado</option><option value="remove-all">Remover todos os links</option></select></label>
      {needsExisting ? <label><span>Hyperlink existente</span><select value={selected} onChange={(event) => { const index = Number(event.target.value); setSelected(index); if (mode === "edit" && links[index]?.url) setUrl(links[index].url); }}>{links.length ? links.map((link, index) => <option key={`${link.page}-${link.index}`} value={index}>Pág. {link.page} · {link.url || "destino interno"}</option>) : <option value={0}>Nenhum link detectado</option>}</select></label> : null}
      {current && needsExisting ? <div className="pro-info-card"><ExternalLink size={17} /><span><strong>Página {current.page}</strong><small>{current.url || "Destino interno"}</small></span></div> : null}
      {(mode === "add-url" || mode === "edit") ? <label><span>{mode === "edit" ? "Nova URL" : "URL"}</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://exemplo.com" /></label> : null}
      {mode === "add-page" ? <label><span>Página de destino</span><input type="number" min={1} value={targetPage} onChange={(event) => setTargetPage(Number(event.target.value) || 1)} /></label> : null}
      {(mode === "add-url" || mode === "add-page") ? <><label><span>Página de origem</span><input type="number" min={1} value={sourcePage} onChange={(event) => setSourcePage(Number(event.target.value) || 1)} /></label><div className="pro-option-grid four"><label><span>X</span><input type="number" value={x} onChange={(event) => setX(Number(event.target.value) || 0)} /></label><label><span>Y</span><input type="number" value={y} onChange={(event) => setY(Number(event.target.value) || 0)} /></label><label><span>Largura</span><input type="number" min={8} value={width} onChange={(event) => setWidth(Number(event.target.value) || 8)} /></label><label><span>Altura</span><input type="number" min={8} value={height} onChange={(event) => setHeight(Number(event.target.value) || 8)} /></label></div><small>Coordenadas PDF em pontos; origem no canto inferior esquerdo.</small></> : null}
      {state.message && state.type === "idle" ? <div className="pro-info-card"><Layers3 size={17} /><span><small>{state.message}</small></span></div> : null}
    </div>

    <button className="process-button" type="button" disabled={!file || state.type === "processing" || (needsExisting && !current)} onClick={() => void process()}>{state.type === "processing" ? <><LoaderCircle className="spin" size={18} /> {state.message}</> : <><Repeat2 size={18} /> Aplicar alteração</>}</button>
    {state.type === "success" ? <div className="status-message success"><CheckCircle2 size={18} /><span>{state.message}</span></div> : null}
    {state.type === "error" ? <div className="status-message error"><span>{state.message}</span></div> : null}
  </section>;
}
