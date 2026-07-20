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
  flag: string;
  dir?: "ltr" | "rtl";
};

export const DEFAULT_LANGUAGE: LanguageCode = "pt-BR";

export const supportedLanguages: SupportedLanguage[] = [
  { code: "pt-BR", label: "Portuguese", nativeLabel: "Portugues", shortLabel: "PT", flag: "🇧🇷" },
  { code: "en", label: "English", nativeLabel: "English", shortLabel: "EN", flag: "🇺🇸" },
  { code: "es", label: "Spanish", nativeLabel: "Espanol", shortLabel: "ES", flag: "🇪🇸" },
  { code: "fr", label: "French", nativeLabel: "Francais", shortLabel: "FR", flag: "🇫🇷" },
  { code: "de", label: "German", nativeLabel: "Deutsch", shortLabel: "DE", flag: "🇩🇪" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", shortLabel: "IT", flag: "🇮🇹" },
  { code: "zh-CN", label: "Chinese", nativeLabel: "Chinese", shortLabel: "ZH", flag: "🇨🇳" },
  { code: "ja", label: "Japanese", nativeLabel: "Japanese", shortLabel: "JA", flag: "🇯🇵" },
  { code: "ko", label: "Korean", nativeLabel: "Korean", shortLabel: "KO", flag: "🇰🇷" },
  { code: "ar", label: "Arabic", nativeLabel: "Arabic", shortLabel: "AR", flag: "🇸🇦", dir: "rtl" },
  { code: "hi", label: "Hindi", nativeLabel: "Hindi", shortLabel: "HI", flag: "🇮🇳" },
  { code: "ru", label: "Russian", nativeLabel: "Russian", shortLabel: "RU", flag: "🇷🇺" },
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
