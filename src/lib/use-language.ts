"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, normalizeLanguage, type LanguageCode } from "@/lib/i18n";

function subscribe(callback: () => void) {
  window.addEventListener("limpdf:languagechange", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("limpdf:languagechange", callback);
    window.removeEventListener("storage", callback);
  };
}

function getClientSnapshot(): LanguageCode {
  return normalizeLanguage(window.localStorage.getItem("limpdf_language") ?? window.navigator.language);
}

function getServerSnapshot(): LanguageCode {
  return DEFAULT_LANGUAGE;
}

export function useLanguage() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
