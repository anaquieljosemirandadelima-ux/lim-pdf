"use client";

import Link from "next/link";
import { ArrowRight, Command, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { navigationGroups } from "@/lib/navigation";
import type { ToolDefinition } from "@/lib/tools";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const popularSlugs = ["juntar-pdf", "editar-pdf", "compactar-pdf", "pdf-para-jpg", "assinar-pdf"];

export function HeaderToolSearch({ tools }: { tools: ToolDefinition[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popular = tools.filter((tool) => popularSlugs.includes(tool.slug));
  const results = useMemo(() => {
    const value = normalize(query.trim());
    if (!value) return tools.slice(0, 7);
    return tools
      .filter((tool) => normalize([tool.name, tool.category, tool.description, ...tool.keywords].join(" ")).includes(value))
      .slice(0, 10);
  }, [query, tools]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <button className="search-trigger" type="button" aria-label="Pesquisar ferramentas" onClick={() => setOpen(true)}>
        <Search size={20} />
        <span className="search-trigger-label">Buscar</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open ? (
        <div className="search-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section className="search-command" role="dialog" aria-modal="true" aria-label="Pesquisar ferramentas PDF">
            <div className="search-command-input">
              <Search size={20} />
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar uma ferramenta PDF..." autoComplete="off" />
              <span><Command size={14} /> K</span>
              <button type="button" aria-label="Fechar pesquisa" onClick={close}><X size={19} /></button>
            </div>

            {!query ? (
              <>
                <div className="search-command-section">
                  <strong>Mais procuradas</strong>
                  <div className="search-popular-chips">
                    {popular.map((tool) => <Link key={tool.slug} href={`/ferramentas/${tool.slug}`} onClick={close}>{tool.name}</Link>)}
                  </div>
                </div>
                <div className="search-command-section">
                  <strong>Categorias</strong>
                  <div className="search-category-chips">
                    {navigationGroups.slice(0, 6).map((group) => <Link key={group.slug} href={`/categorias/${group.slug}`} onClick={close}>{group.title}</Link>)}
                  </div>
                </div>
              </>
            ) : null}

            <div className="search-command-section results-section">
              <strong>{query ? `${results.length} resultado${results.length === 1 ? "" : "s"}` : "Sugestões"}</strong>
              <div className="search-command-results">
                {results.map((tool) => (
                  <Link key={tool.slug} href={`/ferramentas/${tool.slug}`} onClick={close}>
                    <span><b>{tool.name}</b><small>{tool.shortDescription}</small></span>
                    <ArrowRight size={17} />
                  </Link>
                ))}
                {!results.length ? <p>Nenhuma ferramenta encontrada. Tente outro termo.</p> : null}
              </div>
            </div>
            <div className="search-command-footer"><span>Enter para abrir</span><span>Esc para fechar</span><Link href="/ferramentas" onClick={close}>Ver todas as ferramentas</Link></div>
          </section>
        </div>
      ) : null}
    </>
  );
}
