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
  flagCode: string;
  dir?: "ltr" | "rtl";
};

export const DEFAULT_LANGUAGE: LanguageCode = "pt-BR";

export const supportedLanguages: SupportedLanguage[] = [
  { code: "pt-BR", label: "Portuguese", nativeLabel: "Portugu\u00eas", shortLabel: "PT", flagCode: "br" },
  { code: "en", label: "English", nativeLabel: "English", shortLabel: "EN", flagCode: "us" },
  { code: "es", label: "Spanish", nativeLabel: "Espa\u00f1ol", shortLabel: "ES", flagCode: "es" },
  { code: "fr", label: "French", nativeLabel: "Fran\u00e7ais", shortLabel: "FR", flagCode: "fr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", shortLabel: "DE", flagCode: "de" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", shortLabel: "IT", flagCode: "it" },
  { code: "zh-CN", label: "Chinese", nativeLabel: "\u4e2d\u6587", shortLabel: "ZH", flagCode: "cn" },
  { code: "ja", label: "Japanese", nativeLabel: "\u65e5\u672c\u8a9e", shortLabel: "JA", flagCode: "jp" },
  { code: "ko", label: "Korean", nativeLabel: "\ud55c\uad6d\uc5b4", shortLabel: "KO", flagCode: "kr" },
  { code: "ar", label: "Arabic", nativeLabel: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", shortLabel: "AR", flagCode: "sa", dir: "rtl" },
  { code: "hi", label: "Hindi", nativeLabel: "\u0939\u093f\u0928\u094d\u0926\u0940", shortLabel: "HI", flagCode: "in" },
  { code: "ru", label: "Russian", nativeLabel: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", shortLabel: "RU", flagCode: "ru" },
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
