"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ToolCard } from "@/components/ToolCard";
import type { ToolDefinition } from "@/lib/tools";

interface ToolSearchProps {
  tools: ToolDefinition[];
  compact?: boolean;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function ToolSearch({ tools, compact = false }: ToolSearchProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = normalize(query.trim());
    if (!normalized) return compact ? tools.slice(0, 6) : tools;
    return tools.filter((tool) =>
      normalize(
        [tool.name, tool.shortDescription, tool.category, ...tool.keywords].join(" "),
      ).includes(normalized),
    );
  }, [compact, query, tools]);

  return (
    <div className="tool-search-block">
      <label className="search-box">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Pesquisar ferramenta</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar: juntar PDF, girar, marca-d’água..."
          autoComplete="off"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Limpar pesquisa">
            <X size={18} />
          </button>
        ) : null}
      </label>
      {query || !compact ? (
        <div className="search-results" aria-live="polite">
          {filtered.length ? (
            filtered.map((tool) => <ToolCard key={tool.slug} tool={tool} />)
          ) : (
            <p className="empty-search">Nenhuma ferramenta encontrada para “{query}”.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
