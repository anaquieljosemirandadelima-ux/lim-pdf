"use client";

import Link from "next/link";
import { ChevronDown, Globe2, HelpCircle, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getLanguage, supportedLanguages, type LanguageCode } from "@/lib/i18n";
import { useLanguage } from "@/lib/use-language";

const THEME_KEY = "limpdf_theme";
const THEME_EVENT = "limpdf:themechange";

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function getThemeSnapshot() {
  return window.localStorage.getItem(THEME_KEY) === "dark";
}

function getServerThemeSnapshot() {
  return false;
}

export function Header() {
  const [languageOpen, setLanguageOpen] = useState(false);
  const darkMode = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const selectedLanguage = useLanguage();
  const headerRef = useRef<HTMLElement>(null);
  const currentLanguage = getLanguage(selectedLanguage);

  useEffect(() => {
    document.documentElement.dataset.limpdfTheme = darkMode ? "dark" : "light";
  }, [darkMode]);

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

  function toggleTheme() {
    const nextDark = !darkMode;
    window.localStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
    document.documentElement.dataset.limpdfTheme = nextDark ? "dark" : "light";
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <header className="site-header reference-header" ref={headerRef}>
      <div className="reference-header-inner">
        <Link className="header-utility-button" href="/ferramentas" aria-label="Ajuda e ferramentas" title="Ajuda">
          <HelpCircle size={18} />
        </Link>
        <button className="header-utility-button" type="button" aria-label={darkMode ? "Usar tema claro" : "Usar tema escuro"} title="Aparência" onClick={toggleTheme}>
          {darkMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>
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
