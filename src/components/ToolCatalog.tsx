"use client";

import Link from "next/link";
import { ArrowRight, Grid2X2, ListChecks, PencilLine, Repeat2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { ToolIcon } from "@/components/ToolIcon";
import { allToolBySlug, type AllToolSlug, type AnyToolDefinition } from "@/lib/all-tools";
import { proTools, type ProToolDefinition, type ProToolSlug } from "@/lib/pro-tools";
import { releaseTools, type ReleaseToolDefinition, type ReleaseToolSlug } from "@/lib/release-tools";
import { recordRecentTool, toggleFavoriteTool, type ExperienceToolSlug, TOOL_EXPERIENCE_CHANGE_EVENT, TOOL_EXPERIENCE_FAVORITES_KEY, TOOL_EXPERIENCE_RECENTS_KEY } from "@/lib/tool-experience";

type CatalogSlug = AllToolSlug | ProToolSlug | ReleaseToolSlug;
type CatalogTool = AnyToolDefinition | ProToolDefinition | ReleaseToolDefinition;
const proToolBySlug = new Map<ProToolSlug, ProToolDefinition>(proTools.map((tool) => [tool.slug, tool]));
const releaseToolBySlug = new Map<ReleaseToolSlug, ReleaseToolDefinition>(releaseTools.map((tool) => [tool.slug, tool]));

const sections: Array<{ id: "converter" | "editar" | "organizar" | "formularios" | "proteger" | "outros"; title: string; accent: string; icon: typeof Repeat2; tools: CatalogSlug[] }> = [
  { id: "converter", title: "Converter", accent: "blue", icon: Repeat2, tools: ["converter-pdf", "ocr-pdf", "pdf-para-word", "pdf-para-excel", "pdf-para-powerpoint", "pdf-para-jpg", "pdf-para-png", "extrair-imagens-pdf", "word-para-pdf", "excel-para-pdf", "powerpoint-para-pdf", "imagens-para-pdf", "extrair-texto-pdf", "pdf-em-escala-de-cinza"] },
  { id: "editar", title: "Editar", accent: "purple", icon: PencilLine, tools: ["editar-pdf", "links-pdf", "anotacoes-pdf", "editar-metadados-pdf", "assinar-pdf", "adicionar-texto-pdf", "adicionar-imagem-pdf", "destacar-texto", "marca-dagua-pdf", "marcar-confidencial", "cabecalho-rodape-pdf"] },
  { id: "organizar", title: "Organizar", accent: "orange", icon: Grid2X2, tools: ["normalizar-paginas-pdf", "juntar-pdf", "dividir-pdf", "extrair-paginas", "organizar-paginas", "excluir-paginas", "girar-pdf", "duplicar-paginas", "inserir-pagina-em-branco", "alternar-pdfs", "sobrepor-pdfs", "bookmarks-pdf", "comparar-pdfs", "processamento-lote-pdf", "numeracao-bates"] },
  { id: "formularios", title: "Formulários", accent: "teal", icon: ListChecks, tools: ["criar-formulario-pdf", "preencher-formulario-pdf", "achatar-formulario-pdf"] },
  { id: "proteger", title: "Proteger e revisar", accent: "green", icon: ShieldCheck, tools: ["preflight-pdf", "assinatura-digital-pdf", "proteger-pdf", "desbloquear-pdf", "permissoes-pdf", "reparar-pdf", "pdf-a", "limpar-documento-digitalizado", "otimizar-pdf-avancado", "compactar-pdf", "remover-metadados", "recortar-pdf", "redimensionar-pdf"] },
  { id: "outros", title: "Outros", accent: "teal", icon: Sparkles, tools: ["numerar-paginas", "adicionar-fundo-pdf", "espelhar-pdf", "criar-livreto-pdf", "paginas-por-folha"] },
];

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function toolBySlug(slug: CatalogSlug): CatalogTool | undefined { return releaseToolBySlug.get(slug as ReleaseToolSlug) || proToolBySlug.get(slug as ProToolSlug) || allToolBySlug.get(slug as AllToolSlug); }
function resolveTools(slugs: CatalogSlug[]) { return slugs.flatMap((slug) => { const tool = toolBySlug(slug); return tool ? [tool] : []; }); }
function parseStoredToolSlugs(raw: string): CatalogSlug[] { try { const parsed = JSON.parse(raw) as unknown; return Array.isArray(parsed) ? parsed.filter((value): value is CatalogSlug => typeof value === "string" && Boolean(toolBySlug(value as CatalogSlug))) : []; } catch { return []; } }
function useToolStorage(key: string) {
  const subscribe = useCallback((callback: () => void) => { window.addEventListener(TOOL_EXPERIENCE_CHANGE_EVENT, callback); window.addEventListener("storage", callback); return () => { window.removeEventListener(TOOL_EXPERIENCE_CHANGE_EVENT, callback); window.removeEventListener("storage", callback); }; }, []);
  const getSnapshot = useCallback(() => { try { return window.localStorage.getItem(key) || "[]"; } catch { return "[]"; } }, [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]"); return useMemo(() => parseStoredToolSlugs(raw), [raw]);
}

function ToolItem({ tool, favorite, onFavorite }: { tool: CatalogTool; favorite: boolean; onFavorite: (slug: CatalogSlug) => void }) {
  const slug = tool.slug as CatalogSlug;
  return <div className={`reference-catalog-tool-wrap ${favorite ? "favorite" : ""}`}><Link href={`/ferramentas/${slug}`} className="reference-catalog-tool" onClick={() => recordRecentTool(slug as ExperienceToolSlug)}><span className={`reference-catalog-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span><span className="reference-catalog-copy"><strong>{tool.name}</strong><small>{tool.shortDescription}</small></span><ArrowRight size={17} /></Link><button className="reference-favorite-button" type="button" aria-label={favorite ? `Remover ${tool.name} dos favoritos` : `Adicionar ${tool.name} aos favoritos`} aria-pressed={favorite} title={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} onClick={() => onFavorite(slug)}><Sparkles size={15} /></button></div>;
}

export function ToolCatalog() {
  const [active, setActive] = useState<"todas" | "converter" | "editar" | "organizar" | "formularios" | "proteger" | "outros">("todas"); const [query, setQuery] = useState("");
  const favorites = useToolStorage(TOOL_EXPERIENCE_FAVORITES_KEY); const recents = useToolStorage(TOOL_EXPERIENCE_RECENTS_KEY); const normalizedQuery = normalize(query.trim());
  const handleFavorite = (slug: CatalogSlug) => { toggleFavoriteTool(slug as ExperienceToolSlug); };
  const filteredSections = useMemo(() => sections.filter((section) => active === "todas" || section.id === active).map((section) => ({ ...section, resolved: resolveTools(section.tools).filter((tool) => !normalizedQuery || normalize(`${tool.name} ${tool.shortDescription} ${tool.description} ${tool.keywords.join(" ")}`).includes(normalizedQuery)) })).filter((section) => section.resolved.length > 0), [active, normalizedQuery]);
  const tabs = [["todas", "Todas", Grid2X2], ["converter", "Converter", Repeat2], ["editar", "Editar", PencilLine], ["organizar", "Organizar", Grid2X2], ["formularios", "Formulários", ListChecks], ["proteger", "Proteger", ShieldCheck], ["outros", "Outros", Sparkles]] as const;
  const favoriteTools = resolveTools(favorites); const recentTools = resolveTools(recents.filter((slug) => !favorites.includes(slug))).slice(0, 6);
  return <div className="reference-catalog"><div className="reference-catalog-head"><div><h1>Todas as ferramentas</h1><p>Escolha a função, favorite as mais usadas e troque o formato de conversão sem reenviar seu arquivo.</p></div><label className="reference-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ferramenta..." /></label></div>
    {!normalizedQuery && active === "todas" && (favoriteTools.length || recentTools.length) ? <section className="reference-personal-tools" aria-label="Acesso rápido">{favoriteTools.length ? <div><header><span><Sparkles size={17} /></span><strong>Favoritas</strong><small>Ficam sempre à mão neste dispositivo.</small></header><div className="reference-personal-grid">{favoriteTools.slice(0, 6).map((tool) => <ToolItem key={tool.slug} tool={tool} favorite onFavorite={handleFavorite} />)}</div></div> : null}{recentTools.length ? <div><header><span><Repeat2 size={17} /></span><strong>Recentes</strong><small>Continue de onde parou.</small></header><div className="reference-personal-grid">{recentTools.map((tool) => <ToolItem key={tool.slug} tool={tool} favorite={false} onFavorite={handleFavorite} />)}</div></div> : null}</section> : null}
    <div className="reference-catalog-tabs" role="tablist" aria-label="Filtrar ferramentas por categoria">{tabs.map(([id, label, Icon]) => <button key={id} type="button" className={active === id ? "active" : ""} onClick={() => setActive(id)}><Icon size={16} /> {label}</button>)}</div>
    <div className="reference-catalog-sections">{filteredSections.map((section) => { const Icon = section.icon; return <section className={`reference-tool-section accent-${section.accent}`} key={section.id}><header><div><Icon size={21} /><h2>{section.title}</h2></div><button type="button" onClick={() => setActive(section.id)}>Ver todas <ArrowRight size={15} /></button></header><div className="reference-catalog-grid">{section.resolved.map((tool) => <ToolItem key={tool.slug} tool={tool} favorite={favorites.includes(tool.slug as CatalogSlug)} onFavorite={handleFavorite} />)}</div></section>; })}{!filteredSections.length ? <div className="reference-empty-search">Nenhuma ferramenta encontrada.</div> : null}</div>
  </div>;
}
