"use client";

import {
  Check,
  Command,
  Expand,
  FileDown,
  Focus,
  Highlighter,
  ImagePlus,
  Keyboard,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  MousePointer2,
  Plus,
  Redo2,
  Search,
  ShieldCheck,
  Signature,
  Sparkles,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Accent = "blue" | "orange" | "green" | "purple" | "teal" | "rose";

type PremiumToolExperienceProps = {
  toolName: string;
  accent: Accent;
  editor?: boolean;
};

type EditorCommand = {
  id: string;
  label: string;
  hint: string;
  icon: typeof Sparkles;
  run: () => void;
};

function clickButton(selector: string, index = 0) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(selector));
  const target = buttons[index];
  if (!target || target.disabled) return false;
  target.click();
  return true;
}

function clickButtonByText(selector: string, text: string) {
  const target = Array.from(document.querySelectorAll<HTMLButtonElement>(selector))
    .find((button) => button.textContent?.toLocaleLowerCase("pt-BR").includes(text.toLocaleLowerCase("pt-BR")));
  if (!target || target.disabled) return false;
  target.click();
  return true;
}

export function PremiumToolExperience({ toolName, accent, editor = false }: PremiumToolExperienceProps) {
  const [phase, setPhase] = useState(1);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [toast, setToast] = useState("");

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2100);
  }, []);

  const toggleFocus = useCallback(() => {
    const next = !document.body.classList.contains("editor-focus-mode");
    document.body.classList.toggle("editor-focus-mode", next);
    setFocusMode(next);
    notify(next ? "Modo foco ativado" : "Modo foco desativado");
  }, [notify]);

  const requestFullscreen = useCallback(async () => {
    const shell = document.querySelector<HTMLElement>(".pdf-editor-shell");
    if (!shell) return notify("Abra um PDF primeiro.");
    try {
      if (!document.fullscreenElement) await shell.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      notify("Tela cheia não está disponível neste navegador.");
    }
  }, [notify]);

  const fitPage = useCallback(() => {
    const label = document.querySelector<HTMLElement>(".editor-zoom-controls span");
    if (!label) return notify("Abra um PDF primeiro.");
    let guard = 0;
    while (Number.parseInt(label.textContent || "100", 10) > 90 && guard < 15) {
      if (!clickButton(".editor-zoom-controls button", 0)) break;
      guard += 1;
    }
    notify("Visualização ajustada.");
  }, [notify]);

  const resetZoom = useCallback(() => {
    const label = document.querySelector<HTMLElement>(".editor-zoom-controls span");
    if (!label) return notify("Abra um PDF primeiro.");
    let guard = 0;
    while (guard < 20) {
      const value = Number.parseInt(label.textContent || "100", 10);
      if (value === 100) break;
      if (value > 100) clickButton(".editor-zoom-controls button", 0);
      else clickButton(".editor-zoom-controls button", 1);
      guard += 1;
    }
    notify("Zoom em 100%.");
  }, [notify]);

  const findOnPage = useCallback(() => {
    const term = window.prompt("Localizar texto na página atual:")?.trim().toLocaleLowerCase("pt-BR");
    if (!term) return;
    const target = Array.from(document.querySelectorAll<HTMLButtonElement>(".editor-object-text-replacement"))
      .find((item) => (item.title || "").toLocaleLowerCase("pt-BR").includes(term));
    if (!target) return notify("Texto não encontrado nesta página.");
    target.click();
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    notify("Texto localizado e selecionado.");
  }, [notify]);

  const openCompanion = useCallback((slug: string) => {
    window.open(`/ferramentas/${slug}`, "_blank", "noopener,noreferrer");
  }, []);

  const commands = useMemo<EditorCommand[]>(() => editor ? [
    { id: "select", label: "Selecionar objetos", hint: "Ferramenta de seleção", icon: MousePointer2, run: () => clickButton(".editor-tools button", 0) },
    { id: "text", label: "Adicionar texto", hint: "Insere uma nova caixa de texto", icon: Type, run: () => clickButton(".editor-tools button", 1) },
    { id: "highlight", label: "Destacar", hint: "Adiciona destaque ajustável", icon: Highlighter, run: () => clickButton(".editor-tools button", 2) },
    { id: "redact", label: "Redação segura", hint: "Remove visualmente e sanitiza a área", icon: ShieldCheck, run: () => clickButton(".editor-tools button", 3) },
    { id: "comment", label: "Adicionar comentário", hint: "Cria anotação na página", icon: MessageSquareText, run: () => clickButton(".editor-tools button", 4) },
    { id: "signature", label: "Inserir assinatura", hint: "Usa a assinatura desenhada", icon: Signature, run: () => clickButton(".editor-tools button", 5) },
    { id: "image", label: "Adicionar imagem", hint: "Logo, selo, foto ou carimbo", icon: ImagePlus, run: () => clickButton(".editor-tools button", 6) },
    { id: "find", label: "Localizar texto na página", hint: "Encontra uma camada de texto detectado", icon: Search, run: findOnPage },
    { id: "undo", label: "Desfazer", hint: "Ctrl + Z", icon: Undo2, run: () => clickButton(".editor-history button", 0) },
    { id: "redo", label: "Refazer", hint: "Ctrl + Y", icon: Redo2, run: () => clickButton(".editor-history button", 1) },
    { id: "duplicate-page", label: "Duplicar página", hint: "Cria uma cópia após a página atual", icon: Layers3, run: () => clickButtonByText(".page-production-controls button", "Duplicar") },
    { id: "blank-page", label: "Inserir página em branco", hint: "Insere após a página atual", icon: Plus, run: () => clickButtonByText(".page-production-controls button", "Em branco") },
    { id: "fit", label: "Ajustar página à área", hint: "Reduz o zoom para leitura confortável", icon: Focus, run: fitPage },
    { id: "zoom-100", label: "Zoom 100%", hint: "Volta à escala padrão", icon: Expand, run: resetZoom },
    { id: "fullscreen", label: "Tela cheia", hint: "Expande somente o editor", icon: Expand, run: requestFullscreen },
    { id: "focus", label: focusMode ? "Sair do modo foco" : "Modo foco", hint: "Oculta elementos externos ao editor", icon: Focus, run: toggleFocus },
    { id: "export", label: "Baixar PDF editado", hint: "Exporta a versão final", icon: FileDown, run: () => clickButton(".editor-top-actions .primary-button", 0) },
    { id: "watermark", label: "Abrir Marca-d’água", hint: "Fluxo avançado em nova aba", icon: Sparkles, run: () => openCompanion("marca-dagua-pdf") },
    { id: "number", label: "Abrir Numeração de páginas", hint: "Fluxo avançado em nova aba", icon: Layers3, run: () => openCompanion("numerar-paginas") },
    { id: "header", label: "Abrir Cabeçalho e rodapé", hint: "Fluxo avançado em nova aba", icon: Type, run: () => openCompanion("cabecalho-rodape-pdf") },
    { id: "protect", label: "Abrir Proteção por senha", hint: "Fluxo avançado em nova aba", icon: LockKeyhole, run: () => openCompanion("proteger-pdf") },
  ] : [], [editor, findOnPage, fitPage, focusMode, openCompanion, requestFullscreen, resetZoom, toggleFocus]);

  const visibleCommands = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return commands;
    return commands.filter((command) => `${command.label} ${command.hint}`.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [commands, query]);

  useEffect(() => {
    if (!editor) return;
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase("pt-BR") === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editor]);

  useEffect(() => {
    const refresh = () => {
      if (editor) {
        if (document.querySelector(".pdf-editor-shell")) setPhase(2);
        else setPhase(1);
        return;
      }
      const processing = document.querySelector(".status-message.processing,.processing-summary,.process-button:disabled");
      const success = document.querySelector(".status-message.success,.processing-summary");
      const selected = document.querySelector(".selected-files");
      setPhase(success ? 3 : processing ? 2 : selected ? 2 : 1);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "disabled"] });
    return () => observer.disconnect();
  }, [editor]);

  useEffect(() => () => document.body.classList.remove("editor-focus-mode"), []);

  return (
    <>
      <div className={`premium-experience accent-${accent}`}>
        <div className="premium-experience-identity">
          <span className="premium-spark"><Sparkles size={16} /></span>
          <span><strong>{toolName}</strong><small><ShieldCheck size={12} /> Privado no navegador</small></span>
        </div>
        <div className="premium-steps" aria-label="Etapas da ferramenta">
          <span className={phase >= 1 ? "active" : ""}><i>{phase > 1 ? <Check size={11} /> : "1"}</i> Arquivo</span>
          <b />
          <span className={phase >= 2 ? "active" : ""}><i>{phase > 2 ? <Check size={11} /> : "2"}</i> Ajustes</span>
          <b />
          <span className={phase >= 3 ? "active" : ""}><i>3</i> Resultado</span>
        </div>
        {editor ? <div className="premium-editor-actions">
          <button type="button" onClick={toggleFocus} className={focusMode ? "active" : ""}><Focus size={15} /><span>Foco</span></button>
          <button type="button" onClick={requestFullscreen}><Expand size={15} /><span>Tela cheia</span></button>
          <button type="button" className="premium-command-button" onClick={() => setPaletteOpen(true)}><Command size={15} /><span>Comandos</span><kbd>Ctrl K</kbd></button>
        </div> : <span className="premium-easy-chip"><Sparkles size={13} /> Fluxo guiado</span>}
      </div>

      {paletteOpen ? <div className="premium-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}>
        <section className="premium-command-palette" role="dialog" aria-modal="true" aria-label="Comandos do editor">
          <header><div><Command size={18} /><strong>Comandos do editor</strong></div><button type="button" onClick={() => setPaletteOpen(false)} aria-label="Fechar"><X size={18} /></button></header>
          <label className="premium-command-search"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ação..." /><kbd>ESC</kbd></label>
          <div className="premium-command-list">
            {visibleCommands.map((command) => {
              const Icon = command.icon;
              return <button type="button" key={command.id} onClick={() => { command.run(); setPaletteOpen(false); setQuery(""); }}><span><Icon size={17} /></span><div><strong>{command.label}</strong><small>{command.hint}</small></div></button>;
            })}
            {!visibleCommands.length ? <div className="premium-command-empty">Nenhum comando encontrado.</div> : null}
          </div>
          <footer><span><Keyboard size={14} /> Setas para mover objetos · Shift = 10 px</span><span>Ctrl Z desfaz · Ctrl D duplica</span></footer>
        </section>
      </div> : null}
      {toast ? <div className="premium-toast">{toast}</div> : null}
    </>
  );
}
