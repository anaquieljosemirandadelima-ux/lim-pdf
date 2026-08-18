"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Command,
  Download,
  FileText,
  Grid2X2,
  ImagePlus,
  MousePointer2,
  PencilLine,
  Redo2,
  Search,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { catalogToolBySlug, type CatalogToolSlug } from "@/lib/catalog-groups";
import { getNextToolSlugs, recordRecentTool } from "@/lib/tool-experience";

type Accent = "blue" | "orange" | "green" | "purple" | "teal" | "rose";

type PremiumToolExperienceProps = {
  toolName: string;
  toolSlug: CatalogToolSlug;
  accent: Accent;
  editor?: boolean;
};

type EditorCommand = {
  id: string;
  label: string;
  hint: string;
  icon: typeof Sparkles;
  run: () => void | Promise<void>;
};

function buttons(selector: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(selector));
}

function clickButton(selector: string, index = 0) {
  const target = buttons(selector)[index];
  if (!target || target.disabled) return false;
  target.click();
  return true;
}

function clickButtonByText(selector: string, text: string) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  const target = buttons(selector).find((button) => button.textContent?.toLocaleLowerCase("pt-BR").includes(normalized));
  if (!target || target.disabled) return false;
  target.click();
  return true;
}

export function PremiumToolExperience({ toolName, toolSlug, accent, editor = false }: PremiumToolExperienceProps) {
  const [phase, setPhase] = useState(1);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [toast, setToast] = useState("");

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const runOrNotify = useCallback((worked: boolean, success: string, unavailable = "Abra um PDF ou selecione um elemento primeiro.") => {
    notify(worked ? success : unavailable);
  }, [notify]);

  const toggleFocus = useCallback(() => {
    const next = !document.body.classList.contains("editor-focus-mode");
    document.body.classList.toggle("editor-focus-mode", next);
    setFocusMode(next);
    notify(next ? "Modo foco ativado" : "Modo foco desativado");
  }, [notify]);

  const requestFullscreen = useCallback(async () => {
    const shell = document.querySelector<HTMLElement>(".studio-shell,.pdf-editor-shell");
    if (!shell) return notify("Abra um PDF primeiro.");
    try {
      if (!document.fullscreenElement) await shell.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      notify("Tela cheia não está disponível neste navegador.");
    }
  }, [notify]);

  const activateTool = useCallback((label: string, message: string) => {
    const worked = clickButtonByText(".studio-tools button,.editor-tools button", label);
    runOrNotify(worked, message, `A ferramenta ${label} está disponível no modo Studio.`);
  }, [runOrNotify]);

  const findText = useCallback(() => {
    const studioSearch = document.querySelector<HTMLInputElement>(".studio-find-replace input");
    if (studioSearch) {
      studioSearch.focus();
      studioSearch.scrollIntoView({ behavior: "smooth", block: "center" });
      return notify("Digite o texto no painel Localizar e substituir.");
    }
    const term = window.prompt("Localizar texto na página atual:")?.trim().toLocaleLowerCase("pt-BR");
    if (!term) return;
    const target = Array.from(document.querySelectorAll<HTMLButtonElement>(".editor-object-text-replacement")).find((item) => (item.title || "").toLocaleLowerCase("pt-BR").includes(term));
    if (!target) return notify("Texto não encontrado nesta página.");
    target.click();
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    notify("Texto localizado e selecionado.");
  }, [notify]);

  const commands = useMemo<EditorCommand[]>(() => editor ? [
    { id: "studio", label: "Usar Studio", hint: "Desenho, formas, carimbos e tipografia", icon: Sparkles, run: () => runOrNotify(clickButtonByText(".editor-mode-tabs button", "Studio"), "Studio ativado.") },
    { id: "precise", label: "Usar Modo preciso", hint: "Texto detectado, camadas e rascunhos", icon: ShieldCheck, run: () => runOrNotify(clickButtonByText(".editor-mode-tabs button", "Modo preciso"), "Modo preciso ativado.") },
    { id: "select", label: "Selecionar", hint: "Seleciona e move elementos", icon: MousePointer2, run: () => activateTool("Selecionar", "Ferramenta de seleção ativa.") },
    { id: "text", label: "Adicionar texto", hint: "Cria texto com tipografia ajustável", icon: Type, run: () => activateTool("Texto", "Clique na página para inserir texto.") },
    { id: "pen", label: "Caneta livre", hint: "Desenha à mão livre", icon: PencilLine, run: () => activateTool("Caneta", "Caneta ativa. Desenhe diretamente na página.") },
    { id: "highlight", label: "Destacar", hint: "Marca uma área com cor", icon: PencilLine, run: () => activateTool("Destacar", "Arraste sobre a área que deseja destacar.") },
    { id: "line", label: "Linha", hint: "Insere uma linha ajustável", icon: ArrowRight, run: () => activateTool("Linha", "Arraste para criar a linha.") },
    { id: "arrow", label: "Seta", hint: "Insere uma seta", icon: ArrowRight, run: () => activateTool("Seta", "Arraste para criar a seta.") },
    { id: "rect", label: "Retângulo", hint: "Cria uma forma retangular", icon: Grid2X2, run: () => activateTool("Retângulo", "Arraste para criar o retângulo.") },
    { id: "ellipse", label: "Círculo", hint: "Cria círculo ou elipse", icon: Grid2X2, run: () => activateTool("Círculo", "Arraste para criar a forma.") },
    { id: "redact", label: "Redação segura", hint: "Sanitiza a área na exportação", icon: ShieldCheck, run: () => activateTool("Redigir", "Arraste sobre a informação que deseja remover.") },
    { id: "comment", label: "Comentário", hint: "Adiciona anotação", icon: FileText, run: () => activateTool("Comentário", "Clique na página para criar o comentário.") },
    { id: "stamp", label: "Carimbo", hint: "Aprovado, assinado, confidencial e outros", icon: Sparkles, run: () => activateTool("Carimbo", "Escolha o carimbo no painel e clique na página.") },
    { id: "signature", label: "Assinatura", hint: "Insere a assinatura desenhada", icon: Signature, run: () => activateTool("Assinar", "Desenhe a assinatura no painel e clique na página.") },
    { id: "image", label: "Adicionar imagem", hint: "Logo, foto, selo ou carimbo", icon: ImagePlus, run: () => runOrNotify(clickButtonByText(".studio-tools button,.editor-tools button", "Imagem"), "Selecione a imagem.") },
    { id: "find", label: "Localizar e substituir", hint: "Busca texto detectável no PDF", icon: Search, run: findText },
    { id: "undo", label: "Desfazer", hint: "Ctrl + Z", icon: Undo2, run: () => runOrNotify(clickButton(".studio-history button,.editor-history button", 0), "Última alteração desfeita.") },
    { id: "redo", label: "Refazer", hint: "Ctrl + Y", icon: Redo2, run: () => runOrNotify(clickButton(".studio-history button,.editor-history button", 1), "Alteração refeita.") },
    { id: "duplicate", label: "Duplicar elemento", hint: "Cria uma cópia do selecionado", icon: Grid2X2, run: () => runOrNotify(clickButtonByText(".studio-object-summary button,.selection-actions button", "Duplicar"), "Elemento duplicado.") },
    { id: "delete", label: "Excluir elemento", hint: "Remove o elemento selecionado", icon: Trash2, run: () => runOrNotify(clickButtonByText(".studio-properties-head button,.object-layer-row button", "Excluir"), "Elemento removido.") },
    { id: "fullscreen", label: "Tela cheia", hint: "Expande somente o editor", icon: Grid2X2, run: requestFullscreen },
    { id: "focus", label: focusMode ? "Sair do modo foco" : "Modo foco", hint: "Oculta elementos externos", icon: SlidersHorizontal, run: toggleFocus },
    { id: "export", label: "Baixar PDF", hint: "Exporta todas as alterações", icon: Download, run: () => runOrNotify(clickButton(".studio-top-actions .primary-button,.editor-top-actions .primary-button", 0), "Preparando PDF final.") },
  ] : [], [activateTool, editor, findText, focusMode, requestFullscreen, runOrNotify, toggleFocus]);

  const visibleCommands = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return normalized ? commands.filter((command) => `${command.label} ${command.hint}`.toLocaleLowerCase("pt-BR").includes(normalized)) : commands;
  }, [commands, query]);

  const nextTools = useMemo(() => getNextToolSlugs(toolSlug).flatMap((slug) => {
    const tool = catalogToolBySlug.get(slug);
    return tool ? [tool] : [];
  }), [toolSlug]);

  useEffect(() => recordRecentTool(toolSlug), [toolSlug]);

  useEffect(() => {
    if (!editor) return;
    const handleKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen((value) => !value); }
      if (mod && event.key === "Enter") { event.preventDefault(); clickButton(".studio-top-actions .primary-button,.editor-top-actions .primary-button", 0); }
      if (mod && event.shiftKey && event.key.toLowerCase() === "f") { event.preventDefault(); toggleFocus(); }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editor, toggleFocus]);

  useEffect(() => {
    const refresh = () => {
      const text = document.body.textContent || "";
      if (editor) {
        if (/PDF exportado|download foi iniciado|PDF editado/i.test(text)) setPhase(3);
        else if (document.querySelector(".studio-shell,.pdf-editor-shell")) setPhase(2);
        else setPhase(1);
        return;
      }
      const success = document.querySelector(".status-message.success,.advanced-status.success,.processing-summary") || /concluído|download iniciado|arquivo gerado/i.test(text);
      const selected = document.querySelector(".selected-files,.advanced-selected-file");
      setPhase(success ? 3 : selected ? 2 : 1);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "disabled"] });
    return () => observer.disconnect();
  }, [editor]);

  useEffect(() => () => document.body.classList.remove("editor-focus-mode"), []);

  return <>
    <div className={`premium-experience accent-${accent}`}>
      <div className="premium-experience-identity"><span className="premium-spark"><Sparkles size={16} /></span><span><strong>{toolName}</strong><small><ShieldCheck size={12} /> Privado no navegador</small></span></div>
      <div className="premium-steps" aria-label="Etapas da ferramenta"><span className={phase >= 1 ? "active" : ""}><i>{phase > 1 ? <Check size={11} /> : "1"}</i> Arquivo</span><b /><span className={phase >= 2 ? "active" : ""}><i>{phase > 2 ? <Check size={11} /> : "2"}</i> Ajustes</span><b /><span className={phase >= 3 ? "active" : ""}><i>{phase >= 3 ? <Check size={11} /> : "3"}</i> Resultado</span></div>
      {editor ? <div className="premium-editor-actions"><button type="button" onClick={toggleFocus} className={focusMode ? "active" : ""}><SlidersHorizontal size={15} /><span>Foco</span></button><button type="button" onClick={requestFullscreen}><Grid2X2 size={15} /><span>Tela cheia</span></button><button type="button" className="premium-command-button" onClick={() => setPaletteOpen(true)}><Command size={15} /><span>Comandos</span><kbd>Ctrl K</kbd></button></div> : <span className="premium-easy-chip"><Sparkles size={13} /> Fluxo guiado</span>}
    </div>

    {phase >= 3 ? <section className="premium-next-steps" aria-label="Próximas ações sugeridas"><div><span><Check size={16} /></span><div><strong>Pronto. O que deseja fazer agora?</strong><small>Continue trabalhando sem voltar ao início.</small></div></div><div className="premium-next-links">{nextTools.map((tool) => <Link key={tool.slug} href={`/ferramentas/${tool.slug}`} onClick={() => recordRecentTool(tool.slug)}><span>{tool.name}</span><ArrowRight size={14} /></Link>)}</div></section> : null}

    {paletteOpen ? <div className="premium-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}><section className="premium-command-palette" role="dialog" aria-modal="true" aria-label="Comandos do editor"><header><div><Command size={18} /><strong>Comandos do editor</strong></div><button type="button" onClick={() => setPaletteOpen(false)} aria-label="Fechar"><X size={18} /></button></header><label className="premium-command-search"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ação..." /><kbd>ESC</kbd></label><div className="premium-command-list">{visibleCommands.map((command) => { const Icon = command.icon; return <button type="button" key={command.id} onClick={() => { void command.run(); setPaletteOpen(false); setQuery(""); }}><span><Icon size={17} /></span><div><strong>{command.label}</strong><small>{command.hint}</small></div></button>; })}{!visibleCommands.length ? <div className="premium-command-empty">Nenhum comando encontrado.</div> : null}</div><footer><span>Ctrl K abre comandos · Ctrl Enter exporta</span><span>Ctrl Z desfaz · Ctrl Shift F ativa foco</span></footer></section></div> : null}
    {toast ? <div className="premium-toast">{toast}</div> : null}
  </>;
}
