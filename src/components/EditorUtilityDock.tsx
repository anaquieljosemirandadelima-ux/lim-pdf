"use client";

import Link from "next/link";
import { ClipboardCheck, Maximize2, ScanText, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

type SizePreset = "a3" | "a4" | "a5" | "letter" | "legal" | "custom";
type ResizeMode = "fit" | "center" | "fill" | "stretch";
const SIZES: Record<Exclude<SizePreset, "custom">, [number, number]> = { a3: [297, 420], a4: [210, 297], a5: [148, 210], letter: [215.9, 279.4], legal: [215.9, 355.6] };
export type StudioPageSizeDetail = { widthMm: number; heightMm: number; mode: ResizeMode; scope: "current" | "all" };
export type StudioOcrDetail = { languages: string };

export function EditorUtilityDock() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<SizePreset>("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [customWidth, setCustomWidth] = useState(210);
  const [customHeight, setCustomHeight] = useState(297);
  const [mode, setMode] = useState<ResizeMode>("fit");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [ocrLanguage, setOcrLanguage] = useState("por");
  const dimensions = useMemo(() => {
    const base = preset === "custom" ? [customWidth, customHeight] as [number, number] : SIZES[preset];
    const short = Math.min(base[0], base[1]); const long = Math.max(base[0], base[1]);
    return orientation === "portrait" ? [short, long] as [number, number] : [long, short] as [number, number];
  }, [customHeight, customWidth, orientation, preset]);

  function apply() {
    window.dispatchEvent(new CustomEvent<StudioPageSizeDetail>("limpdf:studio-page-size", { detail: { widthMm: dimensions[0], heightMm: dimensions[1], mode, scope } }));
    setOpen(false);
  }
  function runOcr() {
    window.dispatchEvent(new CustomEvent<StudioOcrDetail>("limpdf:studio-ocr", { detail: { languages: ocrLanguage } }));
    setOpen(false);
  }

  return <div className={`editor-utility-dock ${open ? "open" : ""}`}><button type="button" className="editor-utility-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}><SlidersHorizontal size={16} /><span>Página e documento</span></button>{open ? <div className="editor-utility-panel"><header><strong>Dimensionar página</strong><small>Aplique na página atual ou em todas.</small></header><div className="editor-utility-grid"><label><span>Tamanho</span><select value={preset} onChange={(event) => setPreset(event.target.value as SizePreset)}><option value="a4">A4</option><option value="a3">A3</option><option value="a5">A5</option><option value="letter">Carta</option><option value="legal">Legal</option><option value="custom">Personalizado</option></select></label><label><span>Orientação</span><select value={orientation} onChange={(event) => setOrientation(event.target.value as "portrait" | "landscape")}><option value="portrait">Retrato</option><option value="landscape">Paisagem</option></select></label>{preset === "custom" ? <><label><span>Largura (mm)</span><input type="number" min="20" max="2000" value={customWidth} onChange={(event) => setCustomWidth(Number(event.target.value) || 210)} /></label><label><span>Altura (mm)</span><input type="number" min="20" max="2000" value={customHeight} onChange={(event) => setCustomHeight(Number(event.target.value) || 297)} /></label></> : null}<label><span>Conteúdo</span><select value={mode} onChange={(event) => setMode(event.target.value as ResizeMode)}><option value="fit">Ajustar proporcionalmente</option><option value="center">Centralizar</option><option value="fill">Preencher e cortar</option><option value="stretch">Esticar</option></select></label><label><span>Aplicar em</span><select value={scope} onChange={(event) => setScope(event.target.value as "current" | "all")}><option value="current">Página atual</option><option value="all">Todas as páginas</option></select></label></div><button className="primary-button editor-size-apply" type="button" onClick={apply}><Maximize2 size={15} /> Aplicar {dimensions[0]} × {dimensions[1]} mm</button><div className="editor-utility-ocr"><div><strong>OCR dentro do editor</strong><small>Reconhece o documento e reabre a cópia pesquisável no Studio.</small></div><label><span>Idioma</span><select value={ocrLanguage} onChange={(event) => setOcrLanguage(event.target.value)}><option value="por">Português</option><option value="eng">Inglês</option><option value="spa">Espanhol</option><option value="por+eng">Português + inglês</option><option value="por+spa">Português + espanhol</option></select></label><button type="button" className="secondary-button" onClick={runOcr}><ScanText size={15} /> Reconhecer texto agora</button></div><div className="editor-utility-links"><strong>Mais ações</strong><Link href="/ferramentas/preflight-pdf"><ClipboardCheck size={15} /> Preflight antes de enviar</Link></div></div> : null}</div>;
}
