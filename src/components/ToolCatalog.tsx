"use client";

import Link from "next/link";
import { ArrowRight, Grid2X2, PencilLine, Repeat2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { ToolIcon } from "@/components/ToolIcon";
import { allToolBySlug, type AllToolSlug, type AnyToolDefinition } from "@/lib/all-tools";

const sections: Array<{
  id: "converter" | "editar" | "organizar" | "proteger" | "outros";
  title: string;
  accent: string;
  icon: typeof Repeat2;
  tools: AllToolSlug[];
}> = [
  {
    id: "converter",
    title: "Converter",
    accent: "blue",
    icon: Repeat2,
    tools: [
      "pdf-para-word",
      "pdf-para-excel",
      "pdf-para-jpg",
      "pdf-para-png",
      "word-para-pdf",
      "excel-para-pdf",
      "imagens-para-pdf",
      "extrair-texto-pdf",
      "pdf-em-escala-de-cinza",
    ],
  },
  {
    id: "editar",
    title: "Editar",
    accent: "purple",
    icon: PencilLine,
    tools: ["editar-pdf", "assinar-pdf", "adicionar-texto-pdf", "adicionar-imagem-pdf", "destacar-texto", "marca-dagua-pdf", "marcar-confidencial", "cabecalho-rodape-pdf"],
  },
  {
    id: "organizar",
    title: "Organizar",
    accent: "orange",
    icon: Grid2X2,
    tools: ["juntar-pdf", "dividir-pdf", "extrair-paginas", "organizar-paginas", "excluir-paginas", "girar-pdf", "duplicar-paginas", "inserir-pagina-em-branco", "alternar-pdfs", "sobrepor-pdfs"],
  },
  {
    id: "proteger",
    title: "Proteger e otimizar",
    accent: "green",
    icon: ShieldCheck,
    tools: ["proteger-pdf", "desbloquear-pdf", "permissoes-pdf", "compactar-pdf", "remover-metadados", "achatar-formulario-pdf", "recortar-pdf", "redimensionar-pdf", "preencher-formulario-pdf"],
  },
  {
    id: "outros",
    title: "Outros",
    accent: "teal",
    icon: Sparkles,
    tools: ["numerar-paginas", "adicionar-fundo-pdf", "espelhar-pdf", "criar-livreto-pdf", "paginas-por-folha"],
  },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function resolveTools(slugs: AllToolSlug[]) {
  return slugs.flatMap((slug) => {
    const tool = allToolBySlug.get(slug);
    return tool ? [tool] : [];
  });
}

function ToolItem({ tool }: { tool: AnyToolDefinition }) {
  return (
    <Link href={`/ferramentas/${tool.slug}`} className="reference-catalog-tool">
      <span className={`reference-catalog-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span>
      <span className="reference-catalog-copy"><strong>{tool.name}</strong><small>{tool.shortDescription}</small></span>
      <ArrowRight size={17} />
    </Link>
  );
}

export function ToolCatalog() {
  const [active, setActive] = useState<"todas" | "converter" | "editar" | "organizar" | "proteger" | "outros">("todas");
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query.trim());

  const filteredSections = useMemo(() => {
    return sections
      .filter((section) => active === "todas" || section.id === active)
      .map((section) => ({
        ...section,
        resolved: resolveTools(section.tools).filter((tool) => {
          if (!normalizedQuery) return true;
          return normalize(`${tool.name} ${tool.shortDescription} ${tool.description} ${tool.keywords.join(" ")}`).includes(normalizedQuery);
        }),
      }))
      .filter((section) => section.resolved.length > 0);
  }, [active, normalizedQuery]);

  const tabs = [
    ["todas", "Todas", Grid2X2],
    ["converter", "Converter", Repeat2],
    ["editar", "Editar", PencilLine],
    ["organizar", "Organizar", Grid2X2],
    ["proteger", "Proteger", ShieldCheck],
    ["outros", "Outros", Sparkles],
  ] as const;

  return (
    <div className="reference-catalog">
      <div className="reference-catalog-head">
        <div><h1>Todas as ferramentas</h1><p>Escolha a ferramenta ideal para trabalhar com seus PDFs.</p></div>
        <label className="reference-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ferramenta..." /></label>
      </div>

      <div className="reference-catalog-tabs" role="tablist" aria-label="Filtrar ferramentas por categoria">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} type="button" className={active === id ? "active" : ""} onClick={() => setActive(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="reference-catalog-sections">
        {filteredSections.map((section) => {
          const Icon = section.icon;
          return (
            <section className={`reference-tool-section accent-${section.accent}`} key={section.id}>
              <header><div><Icon size={21} /><h2>{section.title}</h2></div><button type="button" onClick={() => setActive(section.id)}>Ver todas <ArrowRight size={15} /></button></header>
              <div className="reference-catalog-grid">{section.resolved.map((tool) => <ToolItem key={tool.slug} tool={tool} />)}</div>
            </section>
          );
        })}
        {!filteredSections.length ? <div className="reference-empty-search">Nenhuma ferramenta encontrada.</div> : null}
      </div>
    </div>
  );
}
