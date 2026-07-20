"use client";

import Link from "next/link";
import React from "react";
import { Search, ShieldCheck, Star, UploadCloud } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ToolIcon } from "@/components/ToolIcon";
import { getGroupTools, navigationGroups } from "@/lib/navigation";
import { toolBySlug } from "@/lib/tools";
import { workflows } from "@/lib/workflows";

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
        {!normalized && active === "todas" ? (
          <section className="catalog-workflows" aria-labelledby="catalog-workflows-title">
            <div className="catalog-workflows-heading">
              <span>Fluxos combinados</span>
              <h2 id="catalog-workflows-title">Atalhos para tarefas completas</h2>
            </div>
            <div className="workflow-grid">
              {workflows.map((workflow) => {
                const firstTool = toolBySlug.get(workflow.tools[0]);
                return (
                  <Link className={`workflow-card accent-${workflow.accent}`} href={firstTool ? `/ferramentas/${firstTool.slug}` : "/ferramentas"} key={workflow.slug}>
                    <strong>{workflow.title}</strong>
                    <p>{workflow.description}</p>
                    <span>{workflow.tools.length} passos sugeridos</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
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
