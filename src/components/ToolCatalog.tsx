"use client";

import Link from "next/link";
import { Search, ShieldCheck, Star, UploadCloud } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ToolIcon } from "@/components/ToolIcon";
import { getGroupTools, navigationGroups } from "@/lib/navigation";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function ToolCatalog() {
  const [active, setActive] = React.useState("todas");
  const [query, setQuery] = React.useState("");
  const normalized = normalize(query.trim());
  const groups = navigationGroups.filter((group) => active === "todas" || group.slug === active);

  return (
    <div className="catalog-app">
      <aside className="catalog-tips">
        <div className="tips-card">
          <h2>Dicas rápidas</h2>
          <p><Search size={17} /> Use a busca para localizar qualquer tarefa.</p>
          <p><Star size={17} /> Abra suas ferramentas mais usadas diretamente pelo cabeçalho.</p>
          <p><UploadCloud size={17} /> Arraste arquivos na tela da ferramenta escolhida.</p>
          <p><ShieldCheck size={17} /> O arquivo fica no navegador durante a operação.</p>
        </div>
      </aside>
      <div className="catalog-main">
        <div className="catalog-heading">
          <div><span>Catálogo completo</span><h1>Todas as ferramentas PDF</h1><p>Funções organizadas por categoria para encontrar rapidamente o que você precisa.</p></div>
          <label className="catalog-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ferramenta..." /></label>
        </div>
        <div className="catalog-tabs" role="tablist" aria-label="Filtrar por categoria">
          <button className={active === "todas" ? "active" : ""} onClick={() => setActive("todas")}>Todas</button>
          {navigationGroups.map((group) => <button className={active === group.slug ? "active" : ""} onClick={() => setActive(group.slug)} key={group.slug}>{group.label}</button>)}
        </div>
        <div className="catalog-groups">
          {groups.map((group) => {
            const groupTools = getGroupTools(group).filter((tool) => !normalized || normalize([tool.name, tool.shortDescription, ...tool.keywords].join(" ")).includes(normalized));
            if (!groupTools.length) return null;
            return (
              <section className={`catalog-group accent-${group.accent}`} key={group.slug}>
                <header><span><CategoryIcon icon={group.icon} /></span><div><h2>{group.title}</h2><p>{group.description}</p></div></header>
                <div className="catalog-tool-list">
                  {groupTools.map((tool) => (
                    <Link href={`/ferramentas/${tool.slug}`} key={tool.slug}>
                      <span className={`mini-tool-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span>
                      <span><strong>{tool.name}</strong><small>{tool.shortDescription}</small></span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import React from "react";
