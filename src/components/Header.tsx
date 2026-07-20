"use client";

import Link from "next/link";
import {
  ChevronDown,
  FileStack,
  Grid2X2,
  Menu,
  PencilLine,
  Repeat2,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
  Sparkles,
  TableProperties,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HeaderToolSearch } from "@/components/HeaderToolSearch";
import { Logo } from "@/components/Logo";
import { getGroupTools, navigationGroups } from "@/lib/navigation";
import { tools } from "@/lib/tools";

const iconMap = {
  organize: Grid2X2,
  edit: PencilLine,
  convert: Repeat2,
  forms: TableProperties,
  sign: Signature,
  security: ShieldCheck,
  optimize: SlidersHorizontal,
};

type MenuDefinition = {
  id: string;
  label: string;
  href: string;
  groupSlugs: string[];
  featured?: { title: string; description: string; href: string };
};

const menuDefinitions: MenuDefinition[] = [
  { id: "all", label: "Ferramentas", href: "/ferramentas", groupSlugs: navigationGroups.map((group) => group.slug), featured: { title: "Todas as ferramentas", description: "Explore as 31 funções disponíveis no LIM PDF.", href: "/ferramentas" } },
  { id: "edit", label: "Editar", href: "/categorias/editar", groupSlugs: ["editar"], featured: { title: "Editor completo de PDF", description: "Edite textos detectados e adicione textos e imagens.", href: "/ferramentas/editar-pdf" } },
  { id: "convert", label: "Converter", href: "/categorias/converter", groupSlugs: ["converter"], featured: { title: "Converter arquivos", description: "Transforme PDF em imagem, texto ou crie PDF a partir de imagens.", href: "/categorias/converter" } },
  { id: "organize", label: "Organizar", href: "/categorias/organizar", groupSlugs: ["organizar"], featured: { title: "Organizar páginas", description: "Junte, divida, gire e reordene seus documentos.", href: "/categorias/organizar" } },
  { id: "protect", label: "Assinar e proteger", href: "/categorias/assinar", groupSlugs: ["assinar", "formularios", "seguranca"], featured: { title: "Assinar PDF", description: "Adicione assinatura visual sem enviar o arquivo ao servidor.", href: "/ferramentas/assinar-pdf" } },
  { id: "optimize", label: "Otimizar", href: "/categorias/otimizar", groupSlugs: ["otimizar"], featured: { title: "Compactar PDF", description: "Reduza o tamanho do documento para compartilhar com facilidade.", href: "/ferramentas/compactar-pdf" } },
];

export function Header() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const groupMap = useMemo(() => new Map(navigationGroups.map((group) => [group.slug, group])), []);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setActiveMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setActiveMenu(null); setMobileOpen(false); }
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onPointer); window.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Menu principal">
          {menuDefinitions.map((menu) => {
            const groups = menu.groupSlugs.map((slug) => groupMap.get(slug)).filter((group) => group !== undefined);
            return (
              <div className={`nav-group ${activeMenu === menu.id ? "open" : ""}`} key={menu.id} onMouseEnter={() => setActiveMenu(menu.id)} onMouseLeave={() => setActiveMenu(null)}>
                <button className="nav-group-trigger" type="button" aria-expanded={activeMenu === menu.id} onClick={() => setActiveMenu((current) => current === menu.id ? null : menu.id)}>
                  {menu.label} <ChevronDown size={15} />
                </button>
                <div className={`mega-menu ${menu.id === "all" ? "mega-menu-all" : "mega-menu-focused"}`}>
                  <div className="mega-menu-content">
                    {groups.map((group) => {
                      const Icon = iconMap[group.icon];
                      return (
                        <section className={`mega-column accent-${group.accent}`} key={group.slug}>
                          <Link className="mega-column-title" href={`/categorias/${group.slug}`} onClick={() => setActiveMenu(null)}>
                            <span><Icon size={19} /></span><div><strong>{group.title}</strong><small>{group.description}</small></div>
                          </Link>
                          <div className="mega-tool-links">
                            {getGroupTools(group).slice(0, menu.id === "all" ? 4 : 10).map((tool) => (
                              <Link key={tool.slug} href={`/ferramentas/${tool.slug}`} onClick={() => setActiveMenu(null)}><b>{tool.name}</b><small>{tool.shortDescription}</small></Link>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                    {menu.featured ? (
                      <aside className="mega-featured">
                        <span><FileStack size={25} /></span>
                        <div><small>Destaque</small><h3>{menu.featured.title}</h3><p>{menu.featured.description}</p></div>
                        <Link href={menu.featured.href} onClick={() => setActiveMenu(null)}>Abrir agora <Sparkles size={15} /></Link>
                      </aside>
                    ) : null}
                  </div>
                  <div className="mega-menu-bottom"><Link href={menu.href} onClick={() => setActiveMenu(null)}>Ver página completa de {menu.label.toLowerCase()}</Link><span>Sem cadastro · Processamento local</span></div>
                </div>
              </div>
            );
          })}
          <Link className="nav-simple-link" href="/guias">Guias</Link>
        </nav>

        <div className="header-actions">
          <HeaderToolSearch tools={tools} />
          <Link className="header-cta" href="/ferramentas/editar-pdf"><UploadCloud size={17} /> Selecionar arquivo</Link>
          <button className="mobile-menu" type="button" aria-label="Abrir menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {mobileOpen ? (
        <div className="mobile-nav-panel">
          <div className="container mobile-nav-content">
            <Link href="/ferramentas" onClick={() => setMobileOpen(false)}>Todas as ferramentas</Link>
            {menuDefinitions.slice(1).map((menu) => <Link key={menu.id} href={menu.href} onClick={() => setMobileOpen(false)}>{menu.label}</Link>)}
            <Link href="/guias" onClick={() => setMobileOpen(false)}>Guias e tutoriais</Link>
            <Link className="mobile-upload-button" href="/ferramentas/editar-pdf" onClick={() => setMobileOpen(false)}><UploadCloud size={17} /> Selecionar arquivo</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
