"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, normalizeLanguage, type LanguageCode } from "@/lib/i18n";

export function useLanguage() {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    return normalizeLanguage(window.localStorage.getItem("limpdf_language") ?? window.navigator.language);
  });

  useEffect(() => {
    const sync = () => setLanguage(normalizeLanguage(window.localStorage.getItem("limpdf_language") ?? window.navigator.language));
    window.addEventListener("limpdf:languagechange", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("limpdf:languagechange", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return language;
}
