export type LanguageCode =
  | "pt-BR"
  | "en"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "zh-CN"
  | "ja"
  | "ko"
  | "ar"
  | "hi"
  | "ru";

export type SupportedLanguage = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  shortLabel: string;
  dir?: "ltr" | "rtl";
};

export const DEFAULT_LANGUAGE: LanguageCode = "pt-BR";

export const supportedLanguages: SupportedLanguage[] = [
  { code: "pt-BR", label: "Portuguese", nativeLabel: "Portugues", shortLabel: "PT" },
  { code: "en", label: "English", nativeLabel: "English", shortLabel: "EN" },
  { code: "es", label: "Spanish", nativeLabel: "Espanol", shortLabel: "ES" },
  { code: "fr", label: "French", nativeLabel: "Francais", shortLabel: "FR" },
  { code: "de", label: "German", nativeLabel: "Deutsch", shortLabel: "DE" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", shortLabel: "IT" },
  { code: "zh-CN", label: "Chinese", nativeLabel: "Chinese", shortLabel: "ZH" },
  { code: "ja", label: "Japanese", nativeLabel: "Japanese", shortLabel: "JA" },
  { code: "ko", label: "Korean", nativeLabel: "Korean", shortLabel: "KO" },
  { code: "ar", label: "Arabic", nativeLabel: "Arabic", shortLabel: "AR", dir: "rtl" },
  { code: "hi", label: "Hindi", nativeLabel: "Hindi", shortLabel: "HI" },
  { code: "ru", label: "Russian", nativeLabel: "Russian", shortLabel: "RU" },
];

const languageCodes = new Set<LanguageCode>(supportedLanguages.map((language) => language.code));

export function normalizeLanguage(value: string | null | undefined): LanguageCode {
  if (!value) return DEFAULT_LANGUAGE;
  if (languageCodes.has(value as LanguageCode)) return value as LanguageCode;
  const base = value.toLowerCase().split("-")[0];
  if (base === "pt") return "pt-BR";
  const match = supportedLanguages.find((language) => language.code.toLowerCase().split("-")[0] === base);
  return match?.code ?? DEFAULT_LANGUAGE;
}

export function getLanguage(code: LanguageCode): SupportedLanguage {
  return supportedLanguages.find((language) => language.code === code) ?? supportedLanguages[0];
}
