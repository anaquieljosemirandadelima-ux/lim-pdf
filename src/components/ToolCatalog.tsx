"use client";

import Link from "next/link";
import { ArrowRight, FileOutput, Grid2X2, PencilLine, Repeat2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { ToolIcon } from "@/components/ToolIcon";
import { allToolBySlug, type AllToolSlug, type AnyToolDefinition } from "@/lib/all-tools";
import { proTools } from "@/lib/pro-tools";
import { recordRecentTool, toggleFavoriteTool, TOOL_EXPERIENCE_CHANGE_EVENT, TOOL_EXPERIENCE_FAVORITES_KEY, TOOL_EXPERIENCE_RECENTS_KEY } from "@/lib/tool-experience";

const sections: Array<{ id: "converter" | "editar" | "organizar" | "proteger" | "outros"; title: string; accent: string; icon: typeof Repeat2; tools: AllToolSlug[] }> = [
  { id: "converter", title: "Converter", accent: "blue", icon: Repeat2, tools: ["pdf-para-word", "pdf-para-excel", "pdf-para-jpg", "pdf-para-png", "word-para-pdf", "excel-para-pdf", "imagens-para-pdf", "extrair-texto-pdf", "pdf-em-escala-de-cinza"] },
  { id: "editar", title: "Editar", accent: "purple", icon: PencilLine, tools: ["editar-pdf", "assinar-pdf", "adicionar-texto-pdf", "adicionar-imagem-pdf", "destacar-texto", "marca-dagua-pdf", "marcar-confidencial", "cabecalho-rodape-pdf"] },
  { id: "organizar", title: "Organizar", accent: "orange", icon: Grid2X2, tools: ["juntar-pdf", "dividir-pdf", "extrair-paginas", "organizar-paginas", "excluir-paginas", "girar-pdf", "duplicar-paginas", "inserir-pagina-em-branco", "alternar-pdfs", "sobrepor-pdfs"] },
  { id: "proteger", title: "Proteger e otimizar", accent: "green", icon: ShieldCheck, tools: ["proteger-pdf", "desbloquear-pdf", "permissoes-pdf", "compactar-pdf", "remover-metadados", "achatar-formulario-pdf", "recortar-pdf", "redimensionar-pdf", "preencher-formulario-pdf"] },
  { id: "outros", title: "Outros", accent: "teal", icon: Sparkles, tools: ["numerar-paginas", "adicionar-fundo-pdf", "espelhar-pdf", "criar-livreto-pdf", "paginas-por-folha"] },
];

type CatalogTab = "todas" | "converter" | "editar" | "organizar" | "proteger" | "outros" | "profissional";

const queryAliases: Record<string, string[]> = {
  compactar: ["comprimir", "diminuir", "reduzir", "menor"],
  juntar: ["unir", "mesclar", "combinar", "merge"],
  dividir: ["separar", "cortar", "split"],
  assinar: ["assinatura", "rubrica", "firmar"],
  proteger: ["senha", "bloquear", "criptografar"],
  ocr: ["escaneado", "digitalizacao", "pesquisavel", "reconhecer texto"],
};

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function resolveTools(slugs: AllToolSlug[]) { return slugs.flatMap((slug) => { const tool = allToolBySlug.get(slug); return tool ? [tool] : []; }); }
function parseStoredToolSlugs(raw: string): AllToolSlug[] { try { const parsed = JSON.parse(raw) as unknown; return Array.isArray(parsed) ? parsed.filter((value): value is AllToolSlug => typeof value === "string") : []; } catch { return []; } }
function expandedQuery(query: string) {
  const normalized = normalize(query);
  const terms = [normalized];
  for (const [canonical, aliases] of Object.entries(queryAliases)) {
    if (normalized.includes(canonical) || aliases.some((alias) => normalized.includes(alias))) terms.push(canonical, ...aliases);
  }
  return [...new Set(terms.filter(Boolean))];
}
function matchesQuery(tool: { name: string; shortDescription: string; description: string; keywords: string[] }, query: string) {
  if (!query) return true;
  const haystack = normalize(`${tool.name} ${tool.shortDescription} ${tool.description} ${tool.keywords.join(" ")}`);
  return expandedQuery(query).some((term) => haystack.includes(term));
}

function useToolStorage(key: string) {
  const subscribe = useCallback((callback: () => void) => { window.addEventListener(TOOL_EXPERIENCE_CHANGE_EVENT, callback); window.addEventListener("storage", callback); return () => { window.removeEventListener(TOOL_EXPERIENCE_CHANGE_EVENT, callback); window.removeEventListener("storage", callback); }; }, []);
  const getSnapshot = useCallback(() => { try { return window.localStorage.getItem(key) || "[]"; } catch { return "[]"; } }, [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  return useMemo(() => parseStoredToolSlugs(raw), [raw]);
}

function ToolItem({ tool, favorite, onFavorite }: { tool: AnyToolDefinition; favorite: boolean; onFavorite: (slug: AllToolSlug) => void }) {
  return <div className={`reference-catalog-tool-wrap ${favorite ? "favorite" : ""}`}><Link href={`/ferramentas/${tool.slug}`} className="reference-catalog-tool" onClick={() => recordRecentTool(tool.slug)}><span className={`reference-catalog-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span><span className="reference-catalog-copy"><strong>{tool.name}</strong><small>{tool.shortDescription}</small></span><ArrowRight size={17} /></Link><button className="reference-favorite-button" type="button" aria-label={favorite ? `Remover ${tool.name} dos favoritos` : `Adicionar ${tool.name} aos favoritos`} aria-pressed={favorite} onClick={() => onFavorite(tool.slug)}><Sparkles size={15} /></button></div>;
}

function ProToolItem({ tool }: { tool: (typeof proTools)[number] }) {
  return <Link href={`/ferramentas/${tool.slug}`} className="reference-pro-tool-card"><span className={`reference-catalog-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span><span><strong>{tool.name}</strong><small>{tool.shortDescription}</small></span><ArrowRight size={17} /></Link>;
}

export function ToolCatalog({ initialQuery = "" }: { initialQuery?: string }) {
  const [active, setActive] = useState<CatalogTab>("todas");
  const [query, setQuery] = useState(initialQuery);
  const favorites = useToolStorage(TOOL_EXPERIENCE_FAVORITES_KEY);
  const recents = useToolStorage(TOOL_EXPERIENCE_RECENTS_KEY);
  const normalizedQuery = normalize(query);
  const handleFavorite = (slug: AllToolSlug) => toggleFavoriteTool(slug);

  const filteredSections = useMemo(() => sections.filter((section) => active === "todas" || section.id === active).map((section) => ({ ...section, resolved: resolveTools(section.tools).filter((tool) => matchesQuery(tool, normalizedQuery)) })).filter((section) => section.resolved.length > 0), [active, normalizedQuery]);
  const filteredProTools = useMemo(() => proTools.filter((tool) => matchesQuery(tool, normalizedQuery)), [normalizedQuery]);
  const tabs = [["todas", "Todas", Grid2X2], ["converter", "Converter", Repeat2], ["editar", "Editar", PencilLine], ["organizar", "Organizar", Grid2X2], ["proteger", "Proteger", ShieldCheck], ["profissional", "Profissional", Sparkles], ["outros", "Outros", Grid2X2]] as const;
  const favoriteTools = resolveTools(favorites);
  const recentTools = resolveTools(recents.filter((slug) => !favorites.includes(slug))).slice(0, 6);
  const showCore = active !== "profissional";
  const showPro = active === "todas" || active === "profissional";

  return <div className="reference-catalog"><div className="reference-catalog-head"><div><h1>Todas as ferramentas</h1><p>Comece pela tarefa principal e abra os controles avançados só quando precisar.</p></div><label className="reference-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar: juntar, assinar, diminuir, Word..." /></label></div>
    {!normalizedQuery && active === "todas" ? <section className="catalog-priority-actions" aria-label="Ações principais"><Link href="/ferramentas/converter-pdf"><span><Repeat2 size={19} /></span><div><strong>Converter PDF</strong><small>Escolha a saída depois do upload</small></div><ArrowRight size={17} /></Link><Link href="/ferramentas/editar-pdf"><span><PencilLine size={19} /></span><div><strong>Editar PDF</strong><small>Texto, imagens, páginas e revisão em um só editor</small></div><ArrowRight size={17} /></Link><Link href="/ferramentas/ocr-pdf"><span><FileOutput size={19} /></span><div><strong>OCR PDF</strong><small>Torne digitalizações pesquisáveis</small></div><ArrowRight size={17} /></Link><Link href="/ferramentas/preflight-pdf"><span><ShieldCheck size={19} /></span><div><strong>Preflight PDF</strong><small>Cheque o arquivo antes de entregar</small></div><ArrowRight size={17} /></Link></section> : null}
    {!normalizedQuery && active === "todas" && (favoriteTools.length || recentTools.length) ? <section className="reference-personal-tools" aria-label="Acesso rápido">{favoriteTools.length ? <div><header><span><Sparkles size={17} /></span><strong>Favoritas</strong><small>Ficam sempre à mão neste dispositivo.</small></header><div className="reference-personal-grid">{favoriteTools.slice(0, 6).map((tool) => <ToolItem key={tool.slug} tool={tool} favorite onFavorite={handleFavorite} />)}</div></div> : null}{recentTools.length ? <div><header><span><Repeat2 size={17} /></span><strong>Recentes</strong><small>Continue de onde parou.</small></header><div className="reference-personal-grid">{recentTools.map((tool) => <ToolItem key={tool.slug} tool={tool} favorite={false} onFavorite={handleFavorite} />)}</div></div> : null}</section> : null}
    <div className="reference-catalog-tabs" role="tablist" aria-label="Filtrar ferramentas por categoria">{tabs.map(([id, label, Icon]) => <button key={id} type="button" className={active === id ? "active" : ""} onClick={() => setActive(id)}><Icon size={16} /> {label}</button>)}</div>
    <div className="reference-catalog-sections">
      {showCore ? filteredSections.map((section) => { const Icon = section.icon; return <section className={`reference-tool-section accent-${section.accent}`} key={section.id}><header><div><Icon size={21} /><h2>{section.title}</h2></div><button type="button" onClick={() => setActive(section.id)}>Ver todas <ArrowRight size={15} /></button></header><div className="reference-catalog-grid">{section.resolved.map((tool) => <ToolItem key={tool.slug} tool={tool} favorite={favorites.includes(tool.slug)} onFavorite={handleFavorite} />)}</div></section>; }) : null}
      {showPro && filteredProTools.length ? <section className="reference-tool-section reference-pro-section accent-purple"><header><div><Sparkles size={21} /><h2>Ferramentas profissionais</h2></div><button type="button" onClick={() => setActive("profissional")}>Ver só profissionais <ArrowRight size={15} /></button></header><div className="reference-pro-grid">{filteredProTools.map((tool) => <ProToolItem key={tool.slug} tool={tool} />)}<Link href="/ferramentas/preflight-pdf" className="reference-pro-tool-card"><span className="reference-catalog-icon accent-green"><ShieldCheck size={19} /></span><span><strong>Preflight PDF</strong><small>Diagnóstico antes de imprimir, enviar ou arquivar.</small></span><ArrowRight size={17} /></Link></div></section> : null}
      {showCore && !filteredSections.length && !showPro ? <div className="reference-empty-search">Nenhuma ferramenta encontrada.</div> : null}
      {active === "profissional" && !filteredProTools.length ? <div className="reference-empty-search">Nenhuma ferramenta profissional encontrada.</div> : null}
    </div>
  </div>;
}
