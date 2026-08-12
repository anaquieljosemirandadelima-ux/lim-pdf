"use client";

import { ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HeaderToolSearch } from "@/components/HeaderToolSearch";
import { Logo } from "@/components/Logo";
import { getLanguage, supportedLanguages, type LanguageCode } from "@/lib/i18n";
import { useLanguage } from "@/lib/use-language";

export function Header() {
  const [languageOpen, setLanguageOpen] = useState(false);
  const selectedLanguage = useLanguage();
  const headerRef = useRef<HTMLElement>(null);
  const currentLanguage = getLanguage(selectedLanguage);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setLanguageOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLanguageOpen(false);
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
  }, [selectedLanguage]);

  function selectLanguage(code: LanguageCode) {
    window.localStorage.setItem("limpdf_language", code);
    window.dispatchEvent(new CustomEvent("limpdf:languagechange", { detail: { language: code } }));
    setLanguageOpen(false);
  }

  return (
    <header className="site-header reference-header" ref={headerRef}>
      <div className="reference-header-inner">
        <Logo />
        <HeaderToolSearch />
        <div className={`reference-language ${languageOpen ? "open" : ""}`}>
          <button type="button" aria-label="Selecionar idioma" aria-expanded={languageOpen} onClick={() => setLanguageOpen((value) => !value)}>
            <Globe2 size={18} />
            <span>{currentLanguage.nativeLabel}</span>
            <ChevronDown size={15} />
          </button>
          <div className="reference-language-menu" role="menu">
            {supportedLanguages.map((language) => (
              <button key={language.code} type="button" role="menuitemradio" aria-checked={selectedLanguage === language.code} className={selectedLanguage === language.code ? "active" : ""} onClick={() => selectLanguage(language.code)}>
                {language.nativeLabel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
