"use client";

import { ArrowRight, Grid2X2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { allTools } from "@/lib/all-tools";
import { catalogToolBySlug, getCatalogGroupForTool } from "@/lib/catalog-groups";
import { toolText, uiText } from "@/lib/i18n-content";
import { navigationGroups } from "@/lib/navigation";
import type { ToolSlug } from "@/lib/tools";
import { useLanguage } from "@/lib/use-language";

type SearchItem = {
  id: string;
  name: string;
  description: string;
  href: string;
  category: string;
  keywords: string[];
  kind: "tool" | "category";
};

const baseToolSlugs = new Set<string>(allTools.map((tool) => tool.slug));
const popularSlugs = ["editar-pdf", "compactar-pdf", "juntar-pdf", "pdf-para-word", "ocr-pdf", "assinar-pdf"];
const aliases: Record<string, string[]> = {
  "editar-pdf": ["alterar pdf", "mexer no pdf", "editar texto", "editor"],
  "compactar-pdf": ["comprimir pdf", "diminuir pdf", "reduzir tamanho", "pdf menor"],
  "juntar-pdf": ["unir pdf", "mesclar pdf", "combinar pdf", "merge pdf"],
  "dividir-pdf": ["separar pdf", "cortar pdf", "split pdf"],
  "pdf-para-word": ["pdf word", "converter para docx", "docx"],
  "ocr-pdf": ["reconhecer texto", "pdf escaneado", "digitalizacao", "pesquisavel"],
  "assinar-pdf": ["assinatura", "rubrica", "firmar pdf"],
  "proteger-pdf": ["senha pdf", "bloquear pdf", "criptografar pdf"],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchScore(item: SearchItem, rawQuery: string) {
  const query = normalize(rawQuery);
  if (!query) return 0;
  const name = normalize(item.name);
  const description = normalize(item.description);
  const category = normalize(item.category);
  const keywords = normalize(item.keywords.join(" "));
  const queryTokens = query.split(" ").filter(Boolean);
  let score = 0;

  if (name === query) score += 120;
  if (name.startsWith(query)) score += 72;
  if (name.includes(query)) score += 48;
  if (keywords.includes(query)) score += 30;
  if (description.includes(query)) score += 18;
  if (category.includes(query)) score += 14;

  for (const token of queryTokens) {
    if (name.split(" ").some((word) => word.startsWith(token))) score += 16;
    if (keywords.includes(token)) score += 10;
    if (description.includes(token)) score += 5;
  }

  return score;
}

function resultId(item: SearchItem) {
  return `global-search-result-${item.kind}-${item.id.replace(/[^a-z0-9_-]/gi, "-")}`;
}

export function HeaderToolSearch() {
  const router = useRouter();
  const language = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const text = uiText[language];

  const items = useMemo<SearchItem[]>(() => {
    const tools = [...catalogToolBySlug.values()].map((tool) => {
      const localized = baseToolSlugs.has(tool.slug)
        ? toolText(language, tool.slug as ToolSlug, tool)
        : { name: tool.name, shortDescription: tool.shortDescription };
      const group = getCatalogGroupForTool(tool.slug);
      return {
        id: `tool:${tool.slug}`,
        name: localized.name,
        description: localized.shortDescription,
        href: `/ferramentas/${tool.slug}`,
        category: group?.title || tool.category,
        keywords: [...tool.keywords, ...(aliases[tool.slug] ?? [])],
        kind: "tool" as const,
      };
    });
    const categories = navigationGroups.map((group) => ({
      id: `category:${group.slug}`,
      name: group.title,
      description: group.description,
      href: `/categorias/${group.slug}`,
      category: "Jornada",
      keywords: [group.label, group.slug, ...group.tools],
      kind: "category" as const,
    }));
    return [...categories, ...tools];
  }, [language]);

  const results = useMemo(() => {
    if (!query.trim()) {
      const categories = items.filter((item) => item.kind === "category").slice(0, 4);
      const popular = popularSlugs.flatMap((slug) => {
        const found = items.find((item) => item.id === `tool:${slug}`);
        return found ? [found] : [];
      });
      return [...popular, ...categories].slice(0, 8);
    }
    return items
      .map((item) => ({ item, score: searchScore(item, query) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, 8)
      .map((result) => result.item);
  }, [items, query]);


  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (target?.tagName !== "INPUT" && target?.tagName !== "TEXTAREA" && !target?.isContentEditable) {
          event.preventDefault();
          inputRef.current?.focus();
          setOpen(true);
        }
      }
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!formRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, []);

  function navigate(item?: SearchItem) {
    const target = item ?? results[activeIndex] ?? results[0];
    if (target) {
      router.push(target.href);
      setQuery("");
    } else {
      navigateToCatalog();
      return;
    }
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }

  function navigateToCatalog() {
    const trimmedQuery = query.trim();
    router.push(`/ferramentas${trimmedQuery ? `?busca=${encodeURIComponent(trimmedQuery)}` : ""}`);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : -1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (results.length ? (index <= 0 ? results.length - 1 : index - 1) : -1));
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      navigate(results[activeIndex]);
    }
  }

  return (
    <form
      ref={formRef}
      className={`header-search global-tool-search ${open ? "open" : ""}`}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        navigate();
      }}
    >
      <label htmlFor="header-tool-search">
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          id="header-tool-search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="global-search-results"
          aria-activedescendant={activeIndex >= 0 ? resultId(results[activeIndex]) : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={text.searchPlaceholder}
          autoComplete="off"
        />
        {query ? (
          <button
            className="search-clear"
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              setQuery("");
              setActiveIndex(-1);
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        ) : (
          <kbd>Ctrl K</kbd>
        )}
      </label>
      <button className="search-submit" type="submit" aria-label="Abrir ferramenta pesquisada">
        <ArrowRight size={17} aria-hidden="true" />
      </button>
      {open ? (
        <div className="global-search-results" id="global-search-results" role="listbox" aria-label="Resultados da busca">
          <div className="global-search-heading">
            <span>{query.trim() ? "Resultados" : "Acesso rápido"}</span>
            <small>{results.length ? `${results.length} opção(ões)` : "Nenhum resultado"}</small>
          </div>
          {results.length ? (
            results.map((item, index) => (
              <button
                type="button"
                role="option"
                id={resultId(item)}
                aria-selected={activeIndex === index}
                className={activeIndex === index ? "active" : ""}
                key={item.id}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => navigate(item)}
              >
                <span className={`search-result-icon ${item.kind}`}>
                  {item.kind === "category" ? <Grid2X2 size={15} aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.description}</small>
                </span>
                <span className="search-result-kind">{item.kind === "category" ? "Jornada" : item.category}</span>
              </button>
            ))
          ) : (
            <div className="global-search-empty">
              <strong>Não encontrei essa ferramenta.</strong>
              <span>Tente “juntar”, “assinar”, “diminuir”, “Word” ou “OCR”.</span>
            </div>
          )}
          <button className="search-view-all" type="button" onClick={navigateToCatalog}>
            Ver todas as ferramentas <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </form>
  );
}
