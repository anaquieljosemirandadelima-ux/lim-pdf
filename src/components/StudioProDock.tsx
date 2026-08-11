"use client";

import { useEffect, useRef, useState } from "react";
import { CopyPlus, Group, Layers3, Ruler, Save, ScanSearch, Trash2, Ungroup } from "lucide-react";

type ProAction = "group" | "ungroup" | "copy-page" | "duplicate" | "delete-selection" | "save-style" | "apply-style";
type Guide = { id: string; axis: "x" | "y"; percent: number };
type StudioProDetail = { action: ProAction; ids: string[]; targetPage?: number; styleName?: string };
function dispatch(detail: StudioProDetail) { window.dispatchEvent(new CustomEvent("limpdf:studio-pro", { detail })); }
function currentCanvasRoot() {
  const candidates = [".studio-stage", ".studio-canvas-stage", ".studio-canvas-area", ".studio-page-wrap", ".studio-page-canvas", ".studio-page", ".editor-canvas", ".editor-page-stage"];
  for (const selector of candidates) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const visible = nodes.find((node) => { const rect = node.getBoundingClientRect(); return rect.width > 150 && rect.height > 150 && getComputedStyle(node).display !== "none"; });
    if (visible) return visible;
  }
  return null;
}
function objectNodes() { const root = currentCanvasRoot(); return root ? Array.from(root.querySelectorAll<HTMLElement>("[data-studio-object-id]")) : []; }
function selectionFromDom() { const selected = objectNodes().filter((node) => node.classList.contains("studio-pro-multi-selected") || node.classList.contains("selected") || node.matches("[aria-selected='true']")); return [...new Set(selected.map((node) => node.dataset.studioObjectId).filter((id): id is string => Boolean(id)))]; }
function intersects(a: DOMRect, b: { left: number; top: number; right: number; bottom: number }) { return a.right >= b.left && a.left <= b.right && a.bottom >= b.top && a.top <= b.bottom; }

export function StudioProDock() {
  const [open, setOpen] = useState(false); const [marquee, setMarquee] = useState(false); const [rulers, setRulers] = useState(false); const [selectedIds, setSelectedIds] = useState<string[]>([]); const [targetPage, setTargetPage] = useState(1); const [guideAxis, setGuideAxis] = useState<"x" | "y">("x"); const [guidePercent, setGuidePercent] = useState(50); const [guides, setGuides] = useState<Guide[]>([]); const [styleName, setStyleName] = useState("Meu estilo"); const [history, setHistory] = useState<string[]>([]); const overlayRef = useRef<HTMLDivElement | null>(null);
  function log(message: string) { setHistory((current) => [message, ...current].slice(0, 7)); }
  function refreshSelection() { const ids = selectionFromDom(); setSelectedIds(ids); return ids; }
  function run(action: ProAction, extra: Partial<StudioProDetail> = {}) {
    const ids = refreshSelection(); if (!ids.length && action !== "apply-style") return; dispatch({ action, ids, ...extra });
    const labels: Record<ProAction, string> = { group: "Objetos agrupados", ungroup: "Grupo desfeito", "copy-page": `Objetos copiados para a página ${extra.targetPage || targetPage}`, duplicate: "Seleção duplicada", "delete-selection": "Seleção removida", "save-style": `Estilo “${extra.styleName || styleName}” salvo`, "apply-style": `Estilo “${extra.styleName || styleName}” aplicado` }; log(labels[action]);
  }

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const node = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-studio-object-id]") : null; if (!node || !currentCanvasRoot()?.contains(node)) return; const id = node.dataset.studioObjectId; if (!id) return;
      if (event.shiftKey || event.metaKey || event.ctrlKey) { event.preventDefault(); setSelectedIds((current) => { const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id]; objectNodes().forEach((item) => item.classList.toggle("studio-pro-multi-selected", next.includes(item.dataset.studioObjectId || ""))); return next; }); }
      else { setSelectedIds([id]); objectNodes().forEach((item) => item.classList.toggle("studio-pro-multi-selected", item.dataset.studioObjectId === id)); }
    };
    document.addEventListener("click", click, true); return () => document.removeEventListener("click", click, true);
  }, []);

  useEffect(() => {
    if (!marquee) return; let start: { x: number; y: number; pointerId: number } | null = null;
    const down = (event: PointerEvent) => { const root = currentCanvasRoot(); if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return; if (event.target instanceof Element && event.target.closest("[data-studio-object-id],button,input,textarea,select")) return; start = { x: event.clientX, y: event.clientY, pointerId: event.pointerId }; const overlay = document.createElement("div"); overlay.className = "studio-pro-marquee"; document.body.appendChild(overlay); overlayRef.current = overlay; event.preventDefault(); };
    const move = (event: PointerEvent) => { if (!start || event.pointerId !== start.pointerId || !overlayRef.current) return; const left = Math.min(start.x, event.clientX); const top = Math.min(start.y, event.clientY); const width = Math.abs(event.clientX - start.x); const height = Math.abs(event.clientY - start.y); Object.assign(overlayRef.current.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }); };
    const up = (event: PointerEvent) => { if (!start || event.pointerId !== start.pointerId) return; const box = { left: Math.min(start.x, event.clientX), top: Math.min(start.y, event.clientY), right: Math.max(start.x, event.clientX), bottom: Math.max(start.y, event.clientY) }; const ids = objectNodes().filter((node) => intersects(node.getBoundingClientRect(), box)).map((node) => node.dataset.studioObjectId!).filter(Boolean); objectNodes().forEach((node) => node.classList.toggle("studio-pro-multi-selected", ids.includes(node.dataset.studioObjectId || ""))); setSelectedIds(ids); overlayRef.current?.remove(); overlayRef.current = null; start = null; if (ids.length) log(`${ids.length} objeto(s) selecionado(s) por área`); };
    document.addEventListener("pointerdown", down, true); document.addEventListener("pointermove", move, true); document.addEventListener("pointerup", up, true);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("pointermove", move, true); document.removeEventListener("pointerup", up, true); overlayRef.current?.remove(); overlayRef.current = null; };
  }, [marquee]);

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null; let observedRoot: Element | null = null;
    const update = () => {
      document.querySelectorAll(".studio-pro-guide,.studio-pro-ruler-x,.studio-pro-ruler-y").forEach((node) => node.remove());
      const root = currentCanvasRoot(); if (!root) return; if (root !== observedRoot) { resizeObserver?.disconnect(); resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => update()) : null; resizeObserver?.observe(root); observedRoot = root; }
      const rect = root.getBoundingClientRect();
      if (rulers) { const rx = document.createElement("div"); rx.className = "studio-pro-ruler-x"; Object.assign(rx.style, { left: `${rect.left}px`, top: `${Math.max(0, rect.top - 22)}px`, width: `${rect.width}px` }); document.body.appendChild(rx); const ry = document.createElement("div"); ry.className = "studio-pro-ruler-y"; Object.assign(ry.style, { left: `${Math.max(0, rect.left - 22)}px`, top: `${rect.top}px`, height: `${rect.height}px` }); document.body.appendChild(ry); }
      for (const guide of guides) { const line = document.createElement("div"); line.className = `studio-pro-guide ${guide.axis === "x" ? "vertical" : "horizontal"}`; if (guide.axis === "x") Object.assign(line.style, { left: `${rect.left + rect.width * guide.percent / 100}px`, top: `${rect.top}px`, height: `${rect.height}px` }); else Object.assign(line.style, { left: `${rect.left}px`, top: `${rect.top + rect.height * guide.percent / 100}px`, width: `${rect.width}px` }); document.body.appendChild(line); }
    };
    update(); window.addEventListener("resize", update); window.addEventListener("scroll", update, true); const observer = new MutationObserver(update); observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "style", "class"] });
    return () => { resizeObserver?.disconnect(); observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); document.querySelectorAll(".studio-pro-guide,.studio-pro-ruler-x,.studio-pro-ruler-y").forEach((node) => node.remove()); };
  }, [guides, rulers]);

  useEffect(() => { const saved = () => log("Biblioteca de estilos atualizada"); window.addEventListener("limpdf:studio-pro-style-saved", saved); return () => window.removeEventListener("limpdf:studio-pro-style-saved", saved); }, []);

  return <div className={`studio-pro-dock ${open ? "open" : ""}`}><button type="button" className="studio-pro-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Layers3 size={16} /><span>Studio Pro</span><b>{selectedIds.length}</b></button>{open ? <div className="studio-pro-panel"><header><strong>Precisão de layout</strong><small>Agrupe, selecione por área, use réguas/guias e reutilize estilos.</small></header><div className="studio-pro-row three"><button type="button" className={marquee ? "active" : ""} onClick={() => setMarquee((value) => !value)}><ScanSearch size={15} /> Área</button><button type="button" onClick={() => run("group")} disabled={selectedIds.length < 2}><Group size={15} /> Agrupar</button><button type="button" onClick={() => run("ungroup")} disabled={!selectedIds.length}><Ungroup size={15} /> Desagrupar</button></div><div className="studio-pro-row three"><button type="button" onClick={() => run("duplicate")} disabled={!selectedIds.length}><CopyPlus size={15} /> Duplicar</button><button type="button" onClick={() => run("delete-selection")} disabled={!selectedIds.length}><Trash2 size={15} /> Excluir</button><button type="button" className={rulers ? "active" : ""} onClick={() => setRulers((value) => !value)}><Ruler size={15} /> Réguas</button></div><div className="studio-pro-field"><label>Página para copiar</label><div><input type="number" min={1} value={targetPage} onChange={(event) => setTargetPage(Math.max(1, Number(event.target.value) || 1))} /><button type="button" onClick={() => run("copy-page", { targetPage })} disabled={!selectedIds.length}>Copiar</button></div></div><div className="studio-pro-field"><label>Guia manual</label><div><select value={guideAxis} onChange={(event) => setGuideAxis(event.target.value as "x" | "y")}><option value="x">Vertical</option><option value="y">Horizontal</option></select><input type="number" min={0} max={100} value={guidePercent} onChange={(event) => setGuidePercent(Math.max(0, Math.min(100, Number(event.target.value) || 0)))} /><button type="button" onClick={() => { setGuides((current) => [...current, { id: crypto.randomUUID(), axis: guideAxis, percent: guidePercent }]); log(`Guia ${guideAxis === "x" ? "vertical" : "horizontal"} em ${guidePercent}%`); }}>Adicionar</button></div></div>{guides.length ? <div className="studio-pro-guides">{guides.map((guide) => <span key={guide.id}>{guide.axis === "x" ? "V" : "H"} {guide.percent}% <button type="button" aria-label="Remover guia" onClick={() => setGuides((current) => current.filter((item) => item.id !== guide.id))}>×</button></span>)}<button type="button" onClick={() => setGuides([])}>Limpar</button></div> : null}<div className="studio-pro-field"><label>Estilo reutilizável</label><div><input value={styleName} onChange={(event) => setStyleName(event.target.value)} /><button type="button" onClick={() => run("save-style", { styleName })} disabled={!selectedIds.length}><Save size={14} /> Salvar</button><button type="button" onClick={() => run("apply-style", { styleName })}>Aplicar</button></div></div><div className="studio-pro-history"><strong>Histórico Pro</strong>{history.length ? history.map((item, index) => <span key={`${item}-${index}`}>{item}</span>) : <small>As ações avançadas desta sessão aparecerão aqui.</small>}</div></div> : null}</div>;
}
