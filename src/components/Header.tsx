"use client";

import Link from "next/link";
import {
  ChevronDown,
  FileStack,
  Grid2X2,
  Languages,
  Menu,
  PencilLine,
  Repeat2,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
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

const primaryMenuDefinitions: MenuDefinition[] = menuDefinitions.length > 0 ? [
  { id: "all", label: "Ferramentas", href: "/ferramentas", groupSlugs: navigationGroups.map((group) => group.slug), featured: { title: "Todas as ferramentas", description: "Explore as 31 funcoes disponiveis no LIM PDF.", href: "/ferramentas" } },
  { id: "organize", label: "Organizar e juntar", href: "/categorias/organizar", groupSlugs: ["organizar"], featured: { title: "Pacote de organizacao", description: "Junte, divida, gire, reordene e alterne documentos em um fluxo so.", href: "/ferramentas/juntar-pdf" } },
  { id: "edit", label: "Editar e assinar", href: "/categorias/editar", groupSlugs: ["editar", "formularios", "assinar"], featured: { title: "Editar e finalizar PDF", description: "Edite textos, preencha campos, assine e fixe o documento final.", href: "/ferramentas/editar-pdf" } },
  { id: "convert", label: "Converter", href: "/categorias/converter", groupSlugs: ["converter"], featured: { title: "Converter arquivos", description: "Transforme PDF em imagem, texto ou crie PDF a partir de imagens.", href: "/categorias/converter" } },
  { id: "optimize", label: "Otimizar e proteger", href: "/categorias/otimizar", groupSlugs: ["otimizar", "seguranca"], featured: { title: "Preparar para envio", description: "Compacte, limpe metadados e ajuste o documento antes de compartilhar.", href: "/ferramentas/compactar-pdf" } },
  ] : [];

const languageOptions = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "zh-CN", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ru", label: "Russian" },
];

export function Header() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUrl] = useState(() => typeof window === "undefined" ? "https://limpdf.com.br" : window.location.href);
  const headerRef = useRef<HTMLElement>(null);
  const groupMap = useMemo(() => new Map(navigationGroups.map((group) => [group.slug, group])), []);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setActiveMenu(null);
        setLanguageOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setActiveMenu(null); setLanguageOpen(false); setMobileOpen(false); }
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onPointer); window.removeEventListener("keydown", onKey); };
  }, []);

  const translateUrl = (code: string) =>
    `https://translate.google.com/translate?sl=pt&tl=${encodeURIComponent(code)}&u=${encodeURIComponent(currentUrl)}`;

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Menu principal">
          {primaryMenuDefinitions.map((menu) => {
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
                        <Link href={menu.featured.href} onClick={() => setActiveMenu(null)}>Abrir agora</Link>
                      </aside>
                    ) : null}
                  </div>
                  <div className="mega-menu-bottom"><Link href={menu.href} onClick={() => setActiveMenu(null)}>Ver página completa de {menu.label.toLowerCase()}</Link><span>{groups.length} grupo(s)</span></div>
                </div>
              </div>
            );
          })}
          <Link className="nav-simple-link" href="/guias">Guias</Link>
        </nav>

        <div className="header-actions">
          <HeaderToolSearch tools={tools} />
          <div className={`language-menu ${languageOpen ? "open" : ""}`}>
            <button
              className="language-trigger"
              type="button"
              aria-label="Selecionar idioma"
              aria-expanded={languageOpen}
              onClick={() => setLanguageOpen((value) => !value)}
            >
              <Languages size={17} />
              <span>Idioma</span>
              <ChevronDown size={14} />
            </button>
            <div className="language-options">
              <a href={currentUrl} onClick={() => setLanguageOpen(false)}>Português</a>
              {languageOptions.map((language) => (
                <a key={language.code} href={translateUrl(language.code)} target="_blank" rel="noopener noreferrer" onClick={() => setLanguageOpen(false)}>
                  {language.label}
                </a>
              ))}
            </div>
          </div>
          <Link className="header-cta" href="/ferramentas/editar-pdf"><UploadCloud size={17} /> Selecionar arquivo</Link>
          <button className="mobile-menu" type="button" aria-label="Abrir menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {mobileOpen ? (
        <div className="mobile-nav-panel">
          <div className="container mobile-nav-content">
            <Link href="/ferramentas" onClick={() => setMobileOpen(false)}>Todas as ferramentas</Link>
            {primaryMenuDefinitions.slice(1).map((menu) => <Link key={menu.id} href={menu.href} onClick={() => setMobileOpen(false)}>{menu.label}</Link>)}
            <Link href="/guias" onClick={() => setMobileOpen(false)}>Guias e tutoriais</Link>
            <div className="mobile-language-list">
              <strong>Idiomas</strong>
              <a href={currentUrl} onClick={() => setMobileOpen(false)}>Português</a>
              {languageOptions.map((language) => (
                <a key={language.code} href={translateUrl(language.code)} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>{language.label}</a>
              ))}
            </div>
            <Link className="mobile-upload-button" href="/ferramentas/editar-pdf" onClick={() => setMobileOpen(false)}><UploadCloud size={17} /> Selecionar arquivo</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
