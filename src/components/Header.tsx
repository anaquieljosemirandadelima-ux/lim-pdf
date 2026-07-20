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
import { toolText } from "@/lib/i18n-content";
import { DEFAULT_LANGUAGE, getLanguage, normalizeLanguage, supportedLanguages, type LanguageCode } from "@/lib/i18n";
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

type HeaderText = {
  tools: string;
  allTools: string;
  organizeMerge: string;
  editSign: string;
  convert: string;
  optimizeProtect: string;
  selectFile: string;
  languages: string;
  featured: string;
  openNow: string;
  viewComplete: string;
  groupCount: string;
  allTitle: string;
  allDescription: string;
  organizeTitle: string;
  organizeDescription: string;
  editTitle: string;
  editDescription: string;
  convertTitle: string;
  convertDescription: string;
  optimizeTitle: string;
  optimizeDescription: string;
};

function FlagIcon({ code }: { code: string }) {
  return (
    <span
      className="flag-icon"
      aria-hidden="true"
      style={{ backgroundImage: `url(https://flagcdn.com/${code}.svg)` }}
    />
  );
}

const toolCount = tools.length;

const headerTranslations: Record<LanguageCode, HeaderText> = {
  "pt-BR": {
    tools: "Ferramentas",
    allTools: "Todas as ferramentas",
    organizeMerge: "Organizar e juntar",
    editSign: "Editar e assinar",
    convert: "Converter",
    optimizeProtect: "Otimizar e proteger",
    selectFile: "Selecionar arquivo",
    languages: "Idiomas",
    featured: "Destaque",
    openNow: "Abrir agora",
    viewComplete: "Ver página completa de",
    groupCount: "grupo(s)",
    allTitle: "Todas as ferramentas",
    allDescription: `Explore as ${toolCount} funções disponíveis no LIM PDF.`,
    organizeTitle: "Pacote de organização",
    organizeDescription: "Junte, divida, gire, reordene e alterne documentos em um fluxo só.",
    editTitle: "Editar e finalizar PDF",
    editDescription: "Substitua texto visualmente, preencha campos, assine e finalize o documento.",
    convertTitle: "Converter arquivos",
    convertDescription: "Transforme PDF em imagem ou texto, ou crie PDF a partir de imagens.",
    optimizeTitle: "Preparar para envio",
    optimizeDescription: "Compacte, limpe metadados e ajuste o documento antes de compartilhar.",
  },
  en: {
    tools: "Tools",
    allTools: "All tools",
    organizeMerge: "Organize and merge",
    editSign: "Edit and sign",
    convert: "Convert",
    optimizeProtect: "Optimize and protect",
    selectFile: "Select file",
    languages: "Languages",
    featured: "Featured",
    openNow: "Open now",
    viewComplete: "View full page for",
    groupCount: "group(s)",
    allTitle: "All PDF tools",
    allDescription: `Explore the ${toolCount} tools available in LIM PDF.`,
    organizeTitle: "Organization package",
    organizeDescription: "Merge, split, rotate, reorder, and alternate documents in one flow.",
    editTitle: "Edit and finalize PDF",
    editDescription: "Replace text visually, fill fields, sign, and finalize the document.",
    convertTitle: "Convert files",
    convertDescription: "Turn PDFs into images or text, or create PDFs from images.",
    optimizeTitle: "Prepare for sharing",
    optimizeDescription: "Compress, clean metadata, and adjust the document before sharing.",
  },
  es: {
    tools: "Herramientas",
    allTools: "Todas las herramientas",
    organizeMerge: "Organizar y unir",
    editSign: "Editar y firmar",
    convert: "Convertir",
    optimizeProtect: "Optimizar y proteger",
    selectFile: "Seleccionar archivo",
    languages: "Idiomas",
    featured: "Destacado",
    openNow: "Abrir ahora",
    viewComplete: "Ver página completa de",
    groupCount: "grupo(s)",
    allTitle: "Todas las herramientas",
    allDescription: `Explora las ${toolCount} funciones disponibles en LIM PDF.`,
    organizeTitle: "Paquete de organización",
    organizeDescription: "Une, divide, gira, reordena y alterna documentos en un solo flujo.",
    editTitle: "Editar y finalizar PDF",
    editDescription: "Sustituye texto visualmente, rellena campos, firma y finaliza el documento.",
    convertTitle: "Convertir archivos",
    convertDescription: "Convierte PDF en imagen o texto, o crea PDF desde imágenes.",
    optimizeTitle: "Preparar para enviar",
    optimizeDescription: "Comprime, limpia metadatos y ajusta el documento antes de compartir.",
  },
};

export function Header() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    return normalizeLanguage(window.localStorage.getItem("limpdf_language") ?? window.navigator.language);
  });
  const headerRef = useRef<HTMLElement>(null);
  const groupMap = useMemo(() => new Map(navigationGroups.map((group) => [group.slug, group])), []);
  const currentLanguage = getLanguage(selectedLanguage);
  const text = headerTranslations[selectedLanguage] ?? headerTranslations[DEFAULT_LANGUAGE];
  const localizedMenus = useMemo<MenuDefinition[]>(() => [
    { id: "all", label: text.tools, href: "/ferramentas", groupSlugs: navigationGroups.map((group) => group.slug), featured: { title: text.allTitle, description: text.allDescription, href: "/ferramentas" } },
    { id: "organize", label: text.organizeMerge, href: "/categorias/organizar", groupSlugs: ["organizar"], featured: { title: text.organizeTitle, description: text.organizeDescription, href: "/ferramentas/juntar-pdf" } },
    { id: "edit", label: text.editSign, href: "/categorias/editar", groupSlugs: ["editar", "formularios", "assinar"], featured: { title: text.editTitle, description: text.editDescription, href: "/ferramentas/editar-pdf" } },
    { id: "convert", label: text.convert, href: "/categorias/converter", groupSlugs: ["converter"], featured: { title: text.convertTitle, description: text.convertDescription, href: "/categorias/converter" } },
    { id: "optimize", label: text.optimizeProtect, href: "/categorias/otimizar", groupSlugs: ["otimizar", "seguranca"], featured: { title: text.optimizeTitle, description: text.optimizeDescription, href: "/ferramentas/compactar-pdf" } },
  ], [text]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setActiveMenu(null);
        setLanguageOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveMenu(null);
        setLanguageOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const language = getLanguage(selectedLanguage);
    document.documentElement.setAttribute("lang", selectedLanguage);
    document.documentElement.setAttribute("dir", language.dir ?? "ltr");
    window.localStorage.setItem("limpdf_language", selectedLanguage);
    window.dispatchEvent(new CustomEvent("limpdf:languagechange", { detail: { language: selectedLanguage } }));
  }, [selectedLanguage]);

  function selectLanguage(code: LanguageCode) {
    setSelectedLanguage(code);
    setLanguageOpen(false);
    setMobileOpen(false);
  }

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Menu principal">
          {localizedMenus.map((menu) => {
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
                              <Link key={tool.slug} href={`/ferramentas/${tool.slug}`} onClick={() => setActiveMenu(null)}><b>{toolText(selectedLanguage, tool.slug, tool).name}</b><small>{toolText(selectedLanguage, tool.slug, tool).shortDescription}</small></Link>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                    {menu.featured ? (
                      <aside className="mega-featured">
                        <span><FileStack size={25} /></span>
                        <div><small>{text.featured}</small><h3>{menu.featured.title}</h3><p>{menu.featured.description}</p></div>
                        <Link href={menu.featured.href} onClick={() => setActiveMenu(null)}>{text.openNow}</Link>
                      </aside>
                    ) : null}
                  </div>
                  <div className="mega-menu-bottom"><Link href={menu.href} onClick={() => setActiveMenu(null)}>{text.viewComplete} {menu.label.toLowerCase()}</Link><span>{groups.length} {text.groupCount}</span></div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="header-actions">
          <HeaderToolSearch tools={tools} />
          <div className={`language-menu ${languageOpen ? "open" : ""}`}>
            <button className="language-trigger" type="button" aria-label="Selecionar idioma" aria-expanded={languageOpen} onClick={() => setLanguageOpen((value) => !value)}>
              <Languages size={17} />
              <span className="language-current"><FlagIcon code={currentLanguage.flagCode} />{currentLanguage.nativeLabel}</span>
              <ChevronDown size={14} />
            </button>
            <div className="language-options" role="menu">
              {supportedLanguages.map((language) => (
                <button key={language.code} type="button" role="menuitemradio" aria-checked={selectedLanguage === language.code} className={selectedLanguage === language.code ? "active" : ""} onClick={() => selectLanguage(language.code)}>
                  <span className="language-option-label"><FlagIcon code={language.flagCode} />{language.nativeLabel}</span>
                </button>
              ))}
            </div>
          </div>
          <Link className="header-cta" href="/ferramentas/editar-pdf"><UploadCloud size={17} /> {text.selectFile}</Link>
          <button className="mobile-menu" type="button" aria-label="Abrir menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {mobileOpen ? (
        <div className="mobile-nav-panel">
          <div className="container mobile-nav-content">
            <Link href="/ferramentas" onClick={() => setMobileOpen(false)}>{text.allTools}</Link>
            {localizedMenus.slice(1).map((menu) => <Link key={menu.id} href={menu.href} onClick={() => setMobileOpen(false)}>{menu.label}</Link>)}
            <div className="mobile-language-list">
              <strong>{text.languages}</strong>
              {supportedLanguages.map((language) => (
                <button key={language.code} type="button" aria-pressed={selectedLanguage === language.code} className={selectedLanguage === language.code ? "active" : ""} onClick={() => selectLanguage(language.code)}>
                  <FlagIcon code={language.flagCode} />
                  {language.nativeLabel}
                </button>
              ))}
            </div>
            <Link className="mobile-upload-button" href="/ferramentas/editar-pdf" onClick={() => setMobileOpen(false)}><UploadCloud size={17} /> {text.selectFile}</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
