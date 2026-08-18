"use client";

import Link from "next/link";
import { ArrowRight, FileOutput, Files, Grid2X2, PencilLine, Repeat2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { ToolIcon } from "@/components/ToolIcon";
import { catalogGroups, catalogToolBySlug, type CatalogGroupId, type CatalogToolDefinition, type CatalogToolSlug } from "@/lib/catalog-groups";
import { getProductToolLabel, getProductToolMeta } from "@/lib/product-catalog";
import { recordRecentTool, toggleFavoriteTool, TOOL_EXPERIENCE_CHANGE_EVENT, TOOL_EXPERIENCE_FAVORITES_KEY, TOOL_EXPERIENCE_RECENTS_KEY } from "@/lib/tool-experience";
import { workflows } from "@/lib/workflows";

type CatalogTab = "todas" | CatalogGroupId;

type CatalogIcon = typeof Grid2X2;

const groupIcons: Record<CatalogGroupId, CatalogIcon> = {
  organizar: Grid2X2,
  editar: PencilLine,
  converter: Repeat2,
  formularios: FileOutput,
  seguranca: ShieldCheck,
  otimizar: Sparkles,
  automacao: Files,
};

const tabs: Array<{ id: CatalogTab; label: string; Icon: CatalogIcon }> = [
  { id: "todas", label: "Todas", Icon: Grid2X2 },
  ...catalogGroups.map((group) => ({ id: group.id, label: group.title, Icon: groupIcons[group.id] })),
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const queryAliases: Record<string, string[]> = {
  compactar: ["comprimir", "diminuir", "reduzir", "menor"],
  juntar: ["unir", "mesclar", "combinar", "merge"],
  dividir: ["separar", "cortar", "split"],
  assinar: ["assinatura", "rubrica", "firmar"],
  proteger: ["senha", "bloquear", "criptografar"],
  imprimir: ["impressao", "livreto", "duplex", "paginas por folha"],
  ocr: ["escaneado", "digitalizacao", "pesquisavel", "reconhecer texto"],
};

function expandedQuery(query: string) {
  const normalized = normalize(query);
  const terms = [normalized];
  for (const [canonical, aliases] of Object.entries(queryAliases)) {
    if (normalized.includes(canonical) || aliases.some((alias) => normalized.includes(alias))) terms.push(canonical, ...aliases);
  }
  return [...new Set(terms.filter(Boolean))];
}

function matchesQuery(tool: CatalogToolDefinition, query: string) {
  if (!query) return true;
  const haystack = normalize(`${tool.name} ${tool.shortDescription} ${tool.description} ${tool.keywords.join(" ")}`);
  return expandedQuery(query).some((term) => haystack.includes(term));
}

function useToolStorage(key: string) {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener(TOOL_EXPERIENCE_CHANGE_EVENT, callback);
    window.addEventListener("storage", callback);
    return () => {
      window.removeEventListener(TOOL_EXPERIENCE_CHANGE_EVENT, callback);
      window.removeEventListener("storage", callback);
    };
  }, []);
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key) || "[]";
    } catch {
      return "[]";
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  return useMemo(() => {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((value): value is CatalogToolSlug => typeof value === "string") : [];
    } catch {
      return [] as CatalogToolSlug[];
    }
  }, [raw]);
}

function resolveTools(slugs: CatalogToolSlug[]) {
  return slugs.flatMap((slug) => {
    const tool = catalogToolBySlug.get(slug);
    return tool ? [tool] : [];
  });
}

function ToolItem({ tool, favorite, onFavorite }: { tool: CatalogToolDefinition; favorite: boolean; onFavorite: (slug: CatalogToolSlug) => void }) {
  const meta = getProductToolMeta(tool.slug);
  return <div className={`reference-catalog-tool-wrap ${favorite ? "favorite" : ""}`}>
    <Link href={`/ferramentas/${tool.slug}`} className="reference-catalog-tool" onClick={() => recordRecentTool(tool.slug)}>
      <span className={`reference-catalog-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span>
      <span className="reference-catalog-copy"><strong>{tool.name}</strong><small>{tool.shortDescription}</small><span className="reference-tool-meta"><span>{getProductToolLabel(tool.slug)}</span><span>Local</span>{meta.supportsBatch ? <span>Lote</span> : null}</span></span>
      <ArrowRight size={17} />
    </Link>
    <button className="reference-favorite-button" type="button" aria-label={favorite ? `Remover ${tool.name} dos favoritos` : `Adicionar ${tool.name} aos favoritos`} aria-pressed={favorite} onClick={() => onFavorite(tool.slug)}><Sparkles size={15} /></button>
  </div>;
}

function RecentToolItem({ tool }: { tool: CatalogToolDefinition }) {
  return <Link href={`/ferramentas/${tool.slug}`} className="reference-recent-tool" onClick={() => recordRecentTool(tool.slug)}>
    <span className={`reference-catalog-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span>
    <span><strong>{tool.name}</strong><small>{tool.shortDescription}</small></span>
    <ArrowRight size={16} aria-hidden="true" />
  </Link>;
}

export function ToolCatalog({ initialQuery = "" }: { initialQuery?: string }) {
  const [active, setActive] = useState<CatalogTab>("todas");
  const [query, setQuery] = useState(initialQuery);
  const favorites = useToolStorage(TOOL_EXPERIENCE_FAVORITES_KEY);
  const recents = useToolStorage(TOOL_EXPERIENCE_RECENTS_KEY);
  const normalizedQuery = normalize(query);
  const handleFavorite = (slug: CatalogToolSlug) => toggleFavoriteTool(slug);

  const filteredSections = useMemo(() => catalogGroups
    .filter((group) => active === "todas" || group.id === active)
    .map((group) => ({ ...group, resolved: resolveTools(group.tools).filter((tool) => matchesQuery(tool, normalizedQuery)) }))
    .filter((group) => group.resolved.length > 0), [active, normalizedQuery]);
  const favoriteTools = resolveTools(favorites);
  const recentTools = resolveTools(recents.filter((slug) => !favorites.includes(slug))).slice(0, 6);
  const showWorkflows = active === "todas" && !normalizedQuery;

  return <div className="reference-catalog">
    <div className="reference-catalog-head"><div><h1>Todas as ferramentas</h1><p>Escolha uma jornada. Cada função aparece uma só vez e os controles avançados ficam dentro do fluxo certo.</p></div><label className="reference-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar: juntar, imprimir, OCR, Word..." /></label></div>
    {!normalizedQuery && active === "todas" ? <div className="catalog-free-banner"><span className="catalog-premium-banner-icon"><Sparkles size={18} /></span><span><strong>O LIM PDF é 100% gratuito</strong><small>Processamento local, sem assinatura obrigatória e sem bloquear downloads ou impressão.</small></span></div> : null}
    {!normalizedQuery && active === "todas" ? <section className="catalog-priority-actions" aria-label="Ações principais"><Link href="/ferramentas/converter-pdf"><span><Repeat2 size={19} /></span><div><strong>Converter PDF</strong><small>Escolha a saída depois do upload</small></div><ArrowRight size={17} /></Link><Link href="/ferramentas/editar-pdf"><span><PencilLine size={19} /></span><div><strong>Editar PDF</strong><small>Texto, imagens, páginas e revisão em um só editor</small></div><ArrowRight size={17} /></Link><Link href="/ferramentas/ocr-pdf"><span><FileOutput size={19} /></span><div><strong>OCR PDF</strong><small>Torne digitalizações pesquisáveis</small></div><ArrowRight size={17} /></Link><Link href="/ferramentas/preflight-pdf"><span><ShieldCheck size={19} /></span><div><strong>Revisar e entregar</strong><small>Cheque privacidade, impressão e qualidade</small></div><ArrowRight size={17} /></Link></section> : null}
    {showWorkflows ? <section className="catalog-workflows" aria-labelledby="catalog-workflows-title"><div className="catalog-workflows-heading"><div><span>Fluxos locais</span><h2 id="catalog-workflows-title">Resolva tarefas completas em sequência</h2></div><small>Os arquivos continuam no seu dispositivo.</small></div><div className="workflow-grid">{workflows.map((workflow) => <article className={`workflow-card accent-${workflow.accent}`} key={workflow.slug}><strong>{workflow.title}</strong><p>{workflow.description}</p><ol>{workflow.tools.map((slug, index) => <li key={slug}><Link href={`/ferramentas/${slug}`} onClick={() => recordRecentTool(slug)}>{index + 1}. {catalogToolBySlug.get(slug)?.name || slug}</Link></li>)}</ol><span>{workflow.tools.length} etapas locais <ArrowRight size={14} /></span></article>)}</div></section> : null}
    {!normalizedQuery && active === "todas" && (favoriteTools.length || recentTools.length) ? <section className="reference-personal-tools" aria-label="Acesso rápido">{favoriteTools.length ? <div><header><span><Sparkles size={17} /></span><strong>Favoritas</strong><small>Ficam sempre à mão neste dispositivo.</small></header><div className="reference-personal-grid">{favoriteTools.slice(0, 6).map((tool) => <ToolItem key={tool.slug} tool={tool} favorite onFavorite={handleFavorite} />)}</div></div> : null}{recentTools.length ? <div><header><span><Repeat2 size={17} /></span><strong>Recentes</strong><small>Continue de onde parou.</small></header><div className="reference-recent-list">{recentTools.map((tool) => <RecentToolItem key={tool.slug} tool={tool} />)}</div></div> : null}</section> : null}
    <div className="reference-catalog-tabs" role="tablist" aria-label="Filtrar ferramentas por jornada">{tabs.map(({ id, label, Icon }) => <button key={id} type="button" role="tab" aria-selected={active === id} className={active === id ? "active" : ""} onClick={() => setActive(id)}><Icon size={16} /> {label}</button>)}</div>
    <div className="reference-catalog-sections">{filteredSections.map((group) => { const Icon = groupIcons[group.id]; return <section className={`reference-tool-section accent-${group.accent}`} key={group.id}><header><div><Icon size={21} /><div><h2>{group.title}</h2><p>{group.description}</p></div></div><button type="button" onClick={() => setActive(group.id)}>Ver somente esta jornada <ArrowRight size={15} /></button></header><div className="reference-catalog-grid">{group.resolved.map((tool) => <ToolItem key={tool.slug} tool={tool} favorite={favorites.includes(tool.slug)} onFavorite={handleFavorite} />)}</div></section>; })}{!filteredSections.length ? <div className="reference-empty-search">Nenhuma ferramenta encontrada nesta jornada. Tente “imprimir”, “OCR”, “juntar” ou “formulário”.</div> : null}</div>
  </div>;
}
