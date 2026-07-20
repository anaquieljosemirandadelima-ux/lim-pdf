"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import {
  ArrowRight,
  Clock3,
  Grid2X2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
} from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ToolIcon } from "@/components/ToolIcon";
import { navigationGroups, type NavigationGroup } from "@/lib/navigation";
import { saveTemporaryFiles } from "@/lib/temporary-cache";
import { toolBySlug, tools, type ToolDefinition, type ToolSlug } from "@/lib/tools";

const FAVORITES_KEY = "limpdf-tool-favorites-v1";
const RECENTS_KEY = "limpdf-tool-recents-v1";

const quickActions = [
  { title: "Selecionar arquivo", description: "Abrir no editor", href: "/ferramentas/editar-pdf", icon: UploadCloud, primary: true },
  { title: "Arrastar PDF", description: "Solte o arquivo aqui", href: "/ferramentas/editar-pdf", icon: UploadCloud, drop: true },
  { title: "Abrir editor", description: "Editar e assinar PDF", href: "/ferramentas/editar-pdf", icon: Sparkles },
  { title: "Converter agora", description: "PDF, imagem e texto", href: "/categorias/converter", icon: ArrowRight },
  { title: "Organizar páginas", description: "Reordenar, dividir e mais", href: "/categorias/organizar", icon: Grid2X2 },
];

const catalogSections: Array<{
  title: string;
  label: string;
  href: string;
  group?: NavigationGroup;
  tools: ToolSlug[];
}> = [
  {
    title: "Editar e assinar",
    label: "Editar",
    href: "/categorias/editar",
    group: navigationGroups.find((group) => group.slug === "editar"),
    tools: ["editar-pdf", "assinar-pdf", "adicionar-texto-pdf", "adicionar-imagem-pdf", "marca-dagua-pdf", "cabecalho-rodape-pdf"],
  },
  {
    title: "Organizar e juntar",
    label: "Organizar",
    href: "/categorias/organizar",
    group: navigationGroups.find((group) => group.slug === "organizar"),
    tools: ["juntar-pdf", "dividir-pdf", "organizar-paginas", "girar-pdf", "excluir-paginas", "extrair-paginas"],
  },
  {
    title: "Converter",
    label: "Conversão",
    href: "/categorias/converter",
    group: navigationGroups.find((group) => group.slug === "converter"),
    tools: ["pdf-para-jpg", "pdf-para-png", "extrair-texto-pdf", "imagens-para-pdf"],
  },
  {
    title: "Otimizar e proteger",
    label: "Otimização",
    href: "/categorias/otimizar",
    group: navigationGroups.find((group) => group.slug === "otimizar"),
    tools: ["compactar-pdf", "redimensionar-pdf", "criar-livreto-pdf", "recortar-pdf", "paginas-por-folha", "remover-metadados"],
  },
  {
    title: "Revisão e anotações",
    label: "Finalização",
    href: "/categorias/editar",
    group: navigationGroups.find((group) => group.slug === "editar"),
    tools: ["numerar-paginas", "adicionar-fundo-pdf", "espelhar-pdf", "marca-dagua-pdf"],
  },
  {
    title: "Formulários e texto",
    label: "Dados",
    href: "/categorias/formularios",
    group: navigationGroups.find((group) => group.slug === "formularios"),
    tools: ["preencher-formulario-pdf", "achatar-formulario-pdf", "extrair-texto-pdf"],
  },
  {
    title: "Impressão e produção",
    label: "Produção",
    href: "/categorias/otimizar",
    group: navigationGroups.find((group) => group.slug === "otimizar"),
    tools: ["redimensionar-pdf", "criar-livreto-pdf", "paginas-por-folha", "pdf-em-escala-de-cinza"],
  },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function readStoredSlugs(key: string): ToolSlug[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((slug): slug is ToolSlug => typeof slug === "string" && toolBySlug.has(slug as ToolSlug));
  } catch {
    return [];
  }
}

function uniqueTools(slugs: ToolSlug[]) {
  return slugs.flatMap((slug) => {
    const tool = toolBySlug.get(slug);
    return tool ? [tool] : [];
  });
}

export function ToolCatalog() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [active, setActive] = React.useState("todas");
  const [query, setQuery] = React.useState("");
  const [dragging, setDragging] = React.useState(false);
  const [favorites, setFavorites] = React.useState<ToolSlug[]>(() => readStoredSlugs(FAVORITES_KEY));
  const [recents, setRecents] = React.useState<ToolSlug[]>(() => readStoredSlugs(RECENTS_KEY));

  const normalized = normalize(query.trim());
  const visibleSections = catalogSections.filter((section) => active === "todas" || section.label === active);
  const favoriteTools = uniqueTools(favorites);
  const recentTools = uniqueTools(recents);
  const searchResults = React.useMemo(() => {
    if (!normalized) return [];
    return tools
      .filter((tool) => normalize([tool.name, tool.category, tool.shortDescription, tool.description, ...tool.keywords].join(" ")).includes(normalized))
      .slice(0, 12);
  }, [normalized]);

  function storeFavorites(next: ToolSlug[]) {
    setFavorites(next);
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  function toggleFavorite(slug: ToolSlug) {
    storeFavorites(favorites.includes(slug) ? favorites.filter((item) => item !== slug) : [slug, ...favorites].slice(0, 12));
  }

  function rememberTool(slug: ToolSlug) {
    const next = [slug, ...recents.filter((item) => item !== slug)].slice(0, 6);
    setRecents(next);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  }

  async function openFilesInEditor(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (!files.length) return;
    await saveTemporaryFiles("tool:editar-pdf", files.slice(0, 1));
    router.push("/ferramentas/editar-pdf");
  }

  function renderTool(tool: ToolDefinition) {
    const favorite = favorites.includes(tool.slug);
    return (
      <article className="catalog-tool-item" key={tool.slug}>
        <Link href={`/ferramentas/${tool.slug}`} onClick={() => rememberTool(tool.slug)}>
          <span className={`mini-tool-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span>
          <span><strong>{tool.name}</strong><small>{tool.shortDescription}</small></span>
        </Link>
        <button
          type="button"
          className={favorite ? "favorite-toggle active" : "favorite-toggle"}
          aria-label={favorite ? `Remover ${tool.name} dos favoritos` : `Adicionar ${tool.name} aos favoritos`}
          onClick={() => toggleFavorite(tool.slug)}
        >
          <Star size={15} fill={favorite ? "currentColor" : "none"} />
        </button>
      </article>
    );
  }

  return (
    <div className="tool-center">
      <section className="tool-center-hero">
        <div className="tool-center-copy">
          <span>Central de Ferramentas</span>
          <h1>Central de Ferramentas</h1>
          <p>Todas as ferramentas que você precisa para trabalhar com PDFs de forma simples, rápida e segura.</p>
        </div>
        <label className="tool-center-search">
          <Search size={20} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar: juntar, assinar, converter..." />
        </label>
      </section>

      <section className="quick-actions" aria-label="Ações rápidas">
        {quickActions.map((action) => {
          const Icon = action.icon;
          if (action.drop) {
            return (
              <button
                type="button"
                key={action.title}
                className={`quick-action ${dragging ? "dragging" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void openFilesInEditor(event.dataTransfer.files);
                }}
              >
                <span><Icon size={22} /></span>
                <b>{action.title}</b>
                <small>{dragging ? "Solte para abrir" : action.description}</small>
                <ArrowRight size={18} />
              </button>
            );
          }
          return (
            <Link className={`quick-action ${action.primary ? "primary" : ""}`} href={action.href} key={action.title}>
              <span><Icon size={22} /></span>
              <b>{action.title}</b>
              <small>{action.description}</small>
              <ArrowRight size={18} />
            </Link>
          );
        })}
        <input ref={fileInputRef} className="sr-only" type="file" accept="application/pdf" onChange={(event) => event.target.files && void openFilesInEditor(event.target.files)} />
      </section>

      {(favoriteTools.length || recentTools.length) && !normalized ? (
        <section className="personal-tool-row" aria-label="Ferramentas salvas">
          {favoriteTools.length ? (
            <div>
              <h2><Star size={16} /> Favoritos</h2>
              <div>{favoriteTools.slice(0, 5).map(renderTool)}</div>
            </div>
          ) : null}
          {recentTools.length ? (
            <div>
              <h2><Clock3 size={16} /> Recentes</h2>
              <div>{recentTools.slice(0, 5).map(renderTool)}</div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="catalog-tabs tool-center-tabs" role="tablist" aria-label="Filtrar por categoria">
        <button className={active === "todas" ? "active" : ""} onClick={() => setActive("todas")}>Todas</button>
        {[...new Set(catalogSections.map((section) => section.label))].map((label) => (
          <button className={active === label ? "active" : ""} onClick={() => setActive(label)} key={label}>{label}</button>
        ))}
      </div>

      {normalized ? (
        <section className="catalog-search-results">
          <h2>{searchResults.length} resultado{searchResults.length === 1 ? "" : "s"} para sua busca</h2>
          <div className="catalog-tool-grid">{searchResults.map(renderTool)}</div>
          {!searchResults.length ? <p>Nenhuma ferramenta encontrada. Tente outro termo.</p> : null}
        </section>
      ) : (
        <section className="tool-center-groups">
          {visibleSections.map((section) => {
            const group = section.group;
            const sectionTools = uniqueTools(section.tools);
            return (
              <article className={`tool-center-group accent-${group?.accent ?? "blue"}`} key={section.title}>
                <header>
                  <div>
                    <span>{group ? <CategoryIcon icon={group.icon} /> : <Grid2X2 size={22} />}</span>
                    <h2>{section.title}</h2>
                  </div>
                  <Link href={section.href}>Ver todas <ArrowRight size={15} /></Link>
                </header>
                <div className="catalog-tool-grid">
                  {sectionTools.map(renderTool)}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="tool-center-safety">
        <ShieldCheck size={20} />
        <span>Seus arquivos ficam nesta sessão do navegador durante o trabalho.</span>
        <Link href="/seguranca">Saiba mais sobre segurança <ArrowRight size={15} /></Link>
      </section>

    </div>
  );
}
