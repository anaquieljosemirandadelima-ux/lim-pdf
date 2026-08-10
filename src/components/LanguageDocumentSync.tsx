"use client";

import { useEffect } from "react";
import { getLanguage } from "@/lib/i18n";
import { useLanguage } from "@/lib/use-language";

export function LanguageDocumentSync() {
  const language = useLanguage();

  useEffect(() => {
    const definition = getLanguage(language);
    document.documentElement.lang = definition.code;
    document.documentElement.dir = definition.dir || "ltr";
  }, [language]);

  return null;
}
