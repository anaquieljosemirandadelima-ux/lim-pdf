"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Command,
  CopyPlus,
  Download,
  FilePlus2,
  FileText,
  Grid2X2,
  ImagePlus,
  Layers3,
  LockKeyhole,
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
  run: () => void | Promise<void>;
};

function clickButton(selector: string, index = 0) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(selector));
  const target = buttons[index];
  if (!target || target.disabled) return false;
  target.click();
  return true;
}

function clickButtonByText(selector: string, text: string) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  const target = Array.from(document.querySelectorAll<HTMLButtonElement>(selector))
    .find((button) => button.textContent?.toLocaleLowerCase("pt-BR").includes(normalized));
  if (!target || target.disabled) return false;
  target.click();
  return true;
}

function waitForPaint() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 42));
}

async function adjustZoom(target: number) {
  for (let attempt = 0; attempt < 22; attempt += 1) {
    const label = document.querySelector<HTMLElement>(".editor-zoom-controls span");
    if (!label) return false;
    const value = Number.parseInt(label.textContent || "100", 10);
    if (!Number.isFinite(value) || Math.abs(value - target) < 5) return true;
    const clicked = value > target
      ? clickButton(".editor-zoom-controls button", 0)
      : clickButton(".editor-zoom-controls button", 1);
    if (!clicked) return false;
    await waitForPaint();
  }
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

  const fitPage = useCallback(async () => {
    const exists = document.querySelector(".editor-zoom-controls span");
    if (!exists) return notify("Abra um PDF primeiro.");
    await adjustZoom(80);
    notify("Página ajustada para uma leitura confortável.");
  }, [notify]);

  const resetZoom = useCallback(async () => {
    const exists = document.querySelector(".editor-zoom-controls span");
    if (!exists) return notify("Abra um PDF primeiro.");
    await adjustZoom(100);
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

  const runOrNotify = useCallback((worked: boolean, success: string, unavailable = "Abra um PDF ou selecione um objeto primeiro.") => {
    notify(worked ? success : unavailable);
  }, [notify]);

  const openCompanion = useCallback((slug: string) => {
    window.open(`/ferramentas/${slug}`, "_blank", "noopener,noreferrer");
  }, []);

  const commands = useMemo<EditorCommand[]>(() => editor ? [
    { id: "select", label: "Selecionar objetos", hint: "Ferramenta de seleção", icon: MousePointer2, run: () => runOrNotify(clickButton(".editor-tools button", 0), "Ferramenta de seleção ativa.") },
    { id: "text", label: "Adicionar texto", hint: "Insere uma nova caixa de texto", icon: Type, run: () => runOrNotify(clickButton(".editor-tools button", 1), "Texto adicionado.") },
    { id: "highlight", label: "Destacar", hint: "Adiciona destaque ajustável", icon: PencilLine, run: () => runOrNotify(clickButton(".editor-tools button", 2), "Destaque adicionado.") },
    { id: "redact", label: "Redação segura", hint: "Remove visualmente e sanitiza a área", icon: ShieldCheck, run: () => runOrNotify(clickButton(".editor-tools button", 3), "Área de redação criada.") },
    { id: "comment", label: "Adicionar comentário", hint: "Cria anotação na página", icon: FileText, run: () => runOrNotify(clickButton(".editor-tools button", 4), "Comentário adicionado.") },
    { id: "signature", label: "Inserir assinatura", hint: "Usa a assinatura desenhada", icon: Signature, run: () => runOrNotify(clickButton(".editor-tools button", 5), "Comando de assinatura acionado.", "Desenhe a assinatura no painel lateral primeiro.") },
    { id: "image", label: "Adicionar imagem", hint: "Logo, selo, foto ou carimbo", icon: ImagePlus, run: () => clickButton(".editor-tools button", 6) },
    { id: "find", label: "Localizar texto na página", hint: "Encontra uma camada de texto detectado", icon: Search, run: findOnPage },

    { id: "copy", label: "Copiar selecionado", hint: "Copia uma ou várias camadas", icon: CopyPlus, run: () => runOrNotify(clickButtonByText(".selection-actions button", "Copiar"), "Objeto copiado.") },
    { id: "duplicate", label: "Duplicar selecionado", hint: "Duplica objetos mantendo o estilo", icon: CopyPlus, run: () => runOrNotify(clickButtonByText(".selection-actions button", "Duplicar"), "Objeto duplicado.") },
    { id: "paste", label: "Colar", hint: "Cola na página atual", icon: CopyPlus, run: () => runOrNotify(clickButtonByText(".selection-actions button", "Colar"), "Objeto colado.", "Copie um objeto antes de colar.") },
    { id: "delete-object", label: "Excluir selecionado", hint: "Remove as camadas selecionadas", icon: Trash2, run: () => runOrNotify(clickButtonByText(".object-layer-row button", "Excluir"), "Objeto removido.") },
    { id: "lock", label: "Bloquear ou desbloquear camada", hint: "Evita movimentos acidentais", icon: LockKeyhole, run: () => runOrNotify(clickButtonByText(".layer-controls button", "Bloquear") || clickButtonByText(".layer-controls button", "Desbloquear"), "Bloqueio da camada atualizado.") },
    { id: "hide", label: "Ocultar ou mostrar camada", hint: "Controla a visibilidade sem excluir", icon: Layers3, run: () => runOrNotify(clickButtonByText(".layer-controls button", "Ocultar") || clickButtonByText(".layer-controls button", "Mostrar"), "Visibilidade atualizada.") },
    { id: "front", label: "Trazer para frente", hint: "Move a camada acima das demais", icon: ArrowUp, run: () => runOrNotify(clickButtonByText(".layer-controls button", "Frente"), "Camada movida para frente.") },
    { id: "back", label: "Enviar para o fundo", hint: "Move a camada atrás das demais", icon: ArrowDown, run: () => runOrNotify(clickButtonByText(".layer-controls button", "Fundo"), "Camada enviada ao fundo.") },

    { id: "align-left", label: "Alinhar à esquerda", hint: "Para seleção múltipla", icon: ArrowLeft, run: () => runOrNotify(clickButtonByText(".alignment-controls button", "Alinhar esq."), "Objetos alinhados.") },
    { id: "align-center", label: "Centralizar horizontalmente", hint: "Para seleção múltipla", icon: Grid2X2, run: () => runOrNotify(clickButtonByText(".alignment-controls button", "Centro H"), "Objetos centralizados.") },
    { id: "align-right", label: "Alinhar à direita", hint: "Para seleção múltipla", icon: ArrowRight, run: () => runOrNotify(clickButtonByText(".alignment-controls button", "Alinhar dir."), "Objetos alinhados.") },
    { id: "align-top", label: "Alinhar ao topo", hint: "Para seleção múltipla", icon: ArrowUp, run: () => runOrNotify(clickButtonByText(".alignment-controls button", "Topo"), "Objetos alinhados ao topo.") },
    { id: "align-bottom", label: "Alinhar à base", hint: "Para seleção múltipla", icon: ArrowDown, run: () => runOrNotify(clickButtonByText(".alignment-controls button", "Base"), "Objetos alinhados à base.") },
    { id: "distribute-h", label: "Distribuir horizontalmente", hint: "Espaçamento uniforme entre 3+ objetos", icon: Grid2X2, run: () => runOrNotify(clickButtonByText(".alignment-controls button", "Distribuir H"), "Objetos distribuídos.") },
    { id: "distribute-v", label: "Distribuir verticalmente", hint: "Espaçamento uniforme entre 3+ objetos", icon: Grid2X2, run: () => runOrNotify(clickButtonByText(".alignment-controls button", "Distribuir V"), "Objetos distribuídos.") },

    { id: "undo", label: "Desfazer", hint: "Ctrl + Z", icon: Undo2, run: () => runOrNotify(clickButton(".editor-history button", 0), "Última alteração desfeita.") },
    { id: "redo", label: "Refazer", hint: "Ctrl + Y", icon: Redo2, run: () => runOrNotify(clickButton(".editor-history button", 1), "Alteração refeita.") },
    { id: "previous-page", label: "Página anterior", hint: "Navega sem sair do editor", icon: ArrowLeft, run: () => runOrNotify(clickButton(".editor-page-navigation button", 0), "Página anterior.") },
    { id: "next-page", label: "Próxima página", hint: "Navega sem sair do editor", icon: ArrowRight, run: () => runOrNotify(clickButton(".editor-page-navigation button", 1), "Próxima página.") },
    { id: "move-page-up", label: "Mover página para cima", hint: "Reordena o documento", icon: ArrowUp, run: () => runOrNotify(clickButton(".page-production-controls button", 0), "Página reordenada.") },
    { id: "move-page-down", label: "Mover página para baixo", hint: "Reordena o documento", icon: ArrowDown, run: () => runOrNotify(clickButton(".page-production-controls button", 1), "Página reordenada.") },
    { id: "duplicate-page", label: "Duplicar página", hint: "Cria uma cópia após a página atual", icon: Layers3, run: () => runOrNotify(clickButtonByText(".page-production-controls button", "Duplicar"), "Página duplicada.") },
    { id: "blank-page", label: "Inserir página em branco", hint: "Insere após a página atual", icon: FilePlus2, run: () => runOrNotify(clickButtonByText(".page-production-controls button", "Em branco"), "Página em branco inserida.") },
    { id: "delete-page", label: "Excluir página", hint: "Mantém ao menos uma página", icon: Trash2, run: () => runOrNotify(clickButtonByText(".page-production-controls button", "Excluir"), "Página removida.") },

    { id: "zoom-out", label: "Diminuir zoom", hint: "Reduz 10%", icon: SlidersHorizontal, run: () => clickButton(".editor-zoom-controls button", 0) },
    { id: "zoom-in", label: "Aumentar zoom", hint: "Aumenta 10%", icon: SlidersHorizontal, run: () => clickButton(".editor-zoom-controls button", 1) },
    { id: "fit", label: "Ajustar página à área", hint: "Vai para aproximadamente 80%", icon: SlidersHorizontal, run: fitPage },
    { id: "zoom-100", label: "Zoom 100%", hint: "Volta à escala padrão", icon: Grid2X2, run: resetZoom },
    { id: "fullscreen", label: "Tela cheia", hint: "Expande somente o editor", icon: Grid2X2, run: requestFullscreen },
    { id: "focus", label: focusMode ? "Sair do modo foco" : "Modo foco", hint: "Oculta elementos externos ao editor", icon: SlidersHorizontal, run: toggleFocus },
    { id: "export", label: "Baixar PDF editado", hint: "Ctrl + Enter", icon: Download, run: () => runOrNotify(clickButton(".editor-top-actions .primary-button", 0), "Preparando o PDF final.") },

    { id: "watermark", label: "Abrir Marca-d’água", hint: "Fluxo especializado em nova aba", icon: Sparkles, run: () => openCompanion("marca-dagua-pdf") },
    { id: "number", label: "Abrir Numeração de páginas", hint: "Fluxo especializado em nova aba", icon: Layers3, run: () => openCompanion("numerar-paginas") },
    { id: "header", label: "Abrir Cabeçalho e rodapé", hint: "Fluxo especializado em nova aba", icon: Type, run: () => openCompanion("cabecalho-rodape-pdf") },
    { id: "background", label: "Abrir Fundo de página", hint: "Fluxo especializado em nova aba", icon: Grid2X2, run: () => openCompanion("adicionar-fundo-pdf") },
    { id: "protect", label: "Abrir Proteção por senha", hint: "Fluxo especializado em nova aba", icon: LockKeyhole, run: () => openCompanion("proteger-pdf") },
    { id: "permissions", label: "Abrir Permissões PDF", hint: "Impressão, cópia e modificação", icon: ShieldCheck, run: () => openCompanion("permissoes-pdf") },
  ] : [], [editor, findOnPage, fitPage, focusMode, openCompanion, requestFullscreen, resetZoom, runOrNotify, toggleFocus]);

  const visibleCommands = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return commands;
    return commands.filter((command) => `${command.label} ${command.hint}`.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [commands, query]);

  useEffect(() => {
    if (!editor) return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLocaleLowerCase("pt-BR") === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        return;
      }
      if (typing) return;
      if (mod && event.key === "Enter") {
        event.preventDefault();
        clickButton(".editor-top-actions .primary-button", 0);
        return;
      }
      if (mod && event.shiftKey && event.key.toLocaleLowerCase("pt-BR") === "f") {
        event.preventDefault();
        toggleFocus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editor, toggleFocus]);

  useEffect(() => {
    const refresh = () => {
      if (editor) {
        const shell = document.querySelector(".pdf-editor-shell");
        if (!shell) return setPhase(1);
        const status = document.querySelector(".editor-status-card")?.textContent?.toLocaleLowerCase("pt-BR") || "";
        setPhase(status.includes("exportado") || status.includes("download") ? 3 : 2);
        return;
      }
      const processing = document.querySelector(".status-message.processing,.process-button[aria-busy='true']");
      const successText = Array.from(document.querySelectorAll<HTMLElement>(".status-message,.processing-summary"))
        .some((node) => /conclu|sucesso|gerado|download/i.test(node.textContent || ""));
      const selected = document.querySelector(".selected-files");
      setPhase(successText ? 3 : processing ? 2 : selected ? 2 : 1);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true, attributeFilter: ["class", "disabled", "aria-busy"] });
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
          <span className={phase >= 3 ? "active" : ""}><i>{phase >= 3 ? <Check size={11} /> : "3"}</i> Resultado</span>
        </div>
        {editor ? <div className="premium-editor-actions">
          <button type="button" onClick={toggleFocus} className={focusMode ? "active" : ""} title="Modo foco (Ctrl+Shift+F)"><SlidersHorizontal size={15} /><span>Foco</span></button>
          <button type="button" onClick={requestFullscreen} title="Tela cheia"><Grid2X2 size={15} /><span>Tela cheia</span></button>
          <button type="button" className="premium-command-button" onClick={() => setPaletteOpen(true)}><Command size={15} /><span>Comandos</span><kbd>Ctrl K</kbd></button>
        </div> : <span className="premium-easy-chip"><Sparkles size={13} /> Fluxo guiado</span>}
      </div>

      {paletteOpen ? <div className="premium-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}>
        <section className="premium-command-palette" role="dialog" aria-modal="true" aria-label="Comandos do editor">
          <header><div><Command size={18} /><strong>Comandos do editor</strong><small>{commands.length} ações</small></div><button type="button" onClick={() => setPaletteOpen(false)} aria-label="Fechar"><X size={18} /></button></header>
          <label className="premium-command-search"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ação, página, camada, zoom..." /><kbd>ESC</kbd></label>
          <div className="premium-command-list">
            {visibleCommands.map((command) => {
              const Icon = command.icon;
              return <button type="button" key={command.id} onClick={() => { void command.run(); setPaletteOpen(false); setQuery(""); }}><span><Icon size={17} /></span><div><strong>{command.label}</strong><small>{command.hint}</small></div></button>;
            })}
            {!visibleCommands.length ? <div className="premium-command-empty">Nenhum comando encontrado.</div> : null}
          </div>
          <footer><span><Type size={14} /> Setas movem objetos · Shift = 10 px</span><span>Ctrl K comandos · Ctrl Enter exporta</span></footer>
        </section>
      </div> : null}
      {toast ? <div className="premium-toast">{toast}</div> : null}
    </>
  );
}
