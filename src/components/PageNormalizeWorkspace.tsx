"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle, Maximize2, ShieldCheck, UploadCloud } from "lucide-react";
import { downloadBytes, humanSize } from "@/lib/browser-files";

const MAX_FILE_SIZE = 80 * 1024 * 1024;
const MM_TO_PT = 72 / 25.4;

type Preset = "a3" | "a4" | "a5" | "letter" | "legal" | "square" | "custom";
type Mode = "fit" | "center" | "fill" | "stretch";
type Orientation = "portrait" | "landscape";
type Status = { type: "idle" | "processing" | "success" | "error"; message?: string };

const PRESETS: Record<Exclude<Preset, "custom">, [number, number]> = {
  a3: [297, 420], a4: [210, 297], a5: [148, 210], letter: [215.9, 279.4], legal: [215.9, 355.6], square: [210, 210],
};

function parsePages(value: string, count: number) {
  if (!value.trim()) return new Set(Array.from({ length: count }, (_, index) => index));
  const result = new Set<number>();
  for (const token of value.split(",").map((item) => item.trim()).filter(Boolean)) {
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]); const end = Number(range[2]); const step = start <= end ? 1 : -1;
      for (let current = start; step > 0 ? current <= end : current >= end; current += step) if (current >= 1 && current <= count) result.add(current - 1);
    } else {
      const page = Number(token); if (Number.isInteger(page) && page >= 1 && page <= count) result.add(page - 1);
    }
  }
  if (!result.size) throw new Error("Informe páginas válidas, por exemplo: 1,3-5. Deixe vazio para aplicar em todas.");
  return result;
}

function baseName(file: File) { return file.name.replace(/\.pdf$/i, ""); }

export function PageNormalizeWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<Preset>("a4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [customWidth, setCustomWidth] = useState(210);
  const [customHeight, setCustomHeight] = useState(297);
  const [mode, setMode] = useState<Mode>("fit");
  const [pages, setPages] = useState("");
  const [marginMm, setMarginMm] = useState(0);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const dimensions = useMemo(() => {
    const raw = preset === "custom" ? [customWidth, customHeight] as [number, number] : PRESETS[preset];
    const [short, long] = raw[0] <= raw[1] ? raw : [raw[1], raw[0]];
    return orientation === "portrait" ? [short, long] as [number, number] : [long, short] as [number, number];
  }, [customHeight, customWidth, orientation, preset]);

  function select(selected: File | null) {
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) return setStatus({ type: "error", message: "O PDF ultrapassa 80 MB." });
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) return setStatus({ type: "error", message: "Selecione um arquivo PDF." });
    setFile(selected); setStatus({ type: "idle" });
  }

  async function process() {
    if (!file || status.type === "processing") return;
    setStatus({ type: "processing", message: "Redimensionando páginas e reposicionando o conteúdo…" });
    try {
      const pdfLib = await import("pdf-lib");
      const source = await pdfLib.PDFDocument.load(await file.arrayBuffer());
      const output = await pdfLib.PDFDocument.create();
      const selectedPages = parsePages(pages, source.getPageCount());
      const targetWidth = dimensions[0] * MM_TO_PT;
      const targetHeight = dimensions[1] * MM_TO_PT;
      const margin = Math.max(0, Math.min(Math.min(targetWidth, targetHeight) / 3, marginMm * MM_TO_PT));
      const availableWidth = Math.max(20, targetWidth - margin * 2);
      const availableHeight = Math.max(20, targetHeight - margin * 2);

      for (let index = 0; index < source.getPageCount(); index += 1) {
        if (!selectedPages.has(index)) {
          const [copied] = await output.copyPages(source, [index]); output.addPage(copied); continue;
        }
        const sourcePage = source.getPage(index);
        const { width: sourceWidth, height: sourceHeight } = sourcePage.getSize();
        const embedded = await output.embedPage(sourcePage);
        const targetPage = output.addPage([targetWidth, targetHeight]);
        let drawWidth = sourceWidth; let drawHeight = sourceHeight;
        if (mode === "fit") {
          const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight); drawWidth = sourceWidth * scale; drawHeight = sourceHeight * scale;
        } else if (mode === "fill") {
          const scale = Math.max(availableWidth / sourceWidth, availableHeight / sourceHeight); drawWidth = sourceWidth * scale; drawHeight = sourceHeight * scale;
        } else if (mode === "stretch") {
          drawWidth = availableWidth; drawHeight = availableHeight;
        }
        targetPage.drawPage(embedded, { x: (targetWidth - drawWidth) / 2, y: (targetHeight - drawHeight) / 2, width: drawWidth, height: drawHeight });
      }
      downloadBytes(await output.save({ useObjectStreams: true }), `${baseName(file)}-${preset}-${orientation}-lim-pdf.pdf`);
      setStatus({ type: "success", message: `PDF gerado em ${dimensions[0]} × ${dimensions[1]} mm nas páginas selecionadas.` });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível dimensionar as páginas." });
    }
  }

  return <section className="workspace page-normalize-workspace">
    {!file ? <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); select(event.dataTransfer.files[0] || null); }}><span className="drop-icon"><Maximize2 size={31} /></span><strong>Dimensione as páginas do PDF</strong><span>Padronize A3, A4, A5, Carta, Ofício/Legal ou um tamanho personalizado.</span><button className="primary-button large-button" type="button" onClick={() => inputRef.current?.click()}><UploadCloud size={18} /> Selecionar PDF</button><input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onChange={(event) => select(event.target.files?.[0] || null)} /><small>Até 80 MB · processamento local</small></div> : <>
      <div className="selected-files"><div className="selected-file-row"><FileText size={18} /><span><strong>{file.name}</strong><small>{humanSize(file.size)}</small></span><button type="button" onClick={() => setFile(null)}>×</button></div></div>
      <div className="page-size-preview"><div style={{ aspectRatio: `${dimensions[0]}/${dimensions[1]}` }}><span>{dimensions[0]} × {dimensions[1]} mm</span></div><p><strong>Tamanho final</strong><small>O conteúdo é reposicionado conforme o modo escolhido, sem alterar as páginas que ficarem fora da seleção.</small></p></div>
      <div className="tool-options page-normalize-options">
        <label><span>Tamanho</span><select value={preset} onChange={(event) => setPreset(event.target.value as Preset)}><option value="a4">A4 — 210 × 297 mm</option><option value="a3">A3 — 297 × 420 mm</option><option value="a5">A5 — 148 × 210 mm</option><option value="letter">Carta — 215,9 × 279,4 mm</option><option value="legal">Legal — 215,9 × 355,6 mm</option><option value="square">Quadrado — 210 × 210 mm</option><option value="custom">Personalizado</option></select></label>
        {preset === "custom" ? <div className="pro-option-grid"><label><span>Largura (mm)</span><input type="number" min="20" max="2000" step="0.1" value={customWidth} onChange={(event) => setCustomWidth(Number(event.target.value) || 210)} /></label><label><span>Altura (mm)</span><input type="number" min="20" max="2000" step="0.1" value={customHeight} onChange={(event) => setCustomHeight(Number(event.target.value) || 297)} /></label></div> : null}
        <label><span>Orientação</span><select value={orientation} onChange={(event) => setOrientation(event.target.value as Orientation)}><option value="portrait">Retrato</option><option value="landscape">Paisagem</option></select></label>
        <label><span>Ajuste do conteúdo</span><select value={mode} onChange={(event) => setMode(event.target.value as Mode)}><option value="fit">Ajustar — cabe inteiro na página</option><option value="center">Centralizar — mantém tamanho original</option><option value="fill">Preencher — ocupa tudo e pode cortar bordas</option><option value="stretch">Esticar — ocupa tudo sem preservar proporção</option></select></label>
        <label><span>Margem (mm)</span><input type="number" min="0" max="80" step="1" value={marginMm} onChange={(event) => setMarginMm(Number(event.target.value) || 0)} /></label>
        <label><span>Páginas</span><input value={pages} onChange={(event) => setPages(event.target.value)} placeholder="Todas — ou 1,3-5" /><small>Deixe vazio para dimensionar todas.</small></label>
        <div className="pro-info-card secure"><ShieldCheck size={17} /><span><strong>Sem distorção por padrão</strong><small>O modo Ajustar preserva a proporção original. Use Esticar apenas quando a deformação for intencional.</small></span></div>
      </div>
      <div className="sticky-tool-action"><div><strong>{dimensions[0]} × {dimensions[1]} mm</strong><small>{pages.trim() ? `Páginas ${pages}` : "Todas as páginas"}</small></div><button className="process-button" type="button" disabled={status.type === "processing"} onClick={() => void process()}>{status.type === "processing" ? <><LoaderCircle className="spin" size={18} /> Dimensionando…</> : <><Maximize2 size={18} /> Aplicar tamanho e baixar</>}</button></div>
    </>}
    {status.type === "success" ? <div className="status-message success"><CheckCircle2 size={18} /><span>{status.message}</span></div> : null}{status.type === "error" ? <div className="status-message error"><span>{status.message}</span></div> : null}
  </section>;
}
