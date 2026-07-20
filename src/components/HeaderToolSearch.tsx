"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toolText, uiText } from "@/lib/i18n-content";
import type { ToolDefinition } from "@/lib/tools";
import { useLanguage } from "@/lib/use-language";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function HeaderToolSearch({ tools }: { tools: ToolDefinition[] }) {
  const router = useRouter();
  const language = useLanguage();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const text = uiText[language];
  const results = useMemo(() => {
    const value = normalize(query.trim());
    if (!value) return tools;
    return tools
      .filter((tool) => {
        const localized = toolText(language, tool.slug, tool);
        return normalize([localized.name, localized.shortDescription, tool.category, tool.description, ...tool.keywords].join(" ")).includes(value);
      })
      .slice(0, 8);
  }, [language, query, tools]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openResult() {
    const value = normalize(query.trim());
    const exact = results.find((tool) => normalize(toolText(language, tool.slug, tool).name) === value);
    const target = exact ?? results[0];
    if (target) {
      router.push(`/ferramentas/${target.slug}`);
      setQuery("");
      inputRef.current?.blur();
      return;
    }
    router.push("/ferramentas");
  }

  return (
    <form className="header-search" role="search" onSubmit={(event) => { event.preventDefault(); openResult(); }}>
      <label htmlFor="header-tool-search">
        <Search size={20} />
        <input
          ref={inputRef}
          id="header-tool-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={text.searchPlaceholder}
          autoComplete="off"
          list="header-tool-search-options"
        />
      </label>
      <datalist id="header-tool-search-options">
        {results.map((tool) => {
          const localized = toolText(language, tool.slug, tool);
          return <option key={tool.slug} value={localized.name} />;
        })}
      </datalist>
      <button type="submit" aria-label="Abrir ferramenta pesquisada">
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
