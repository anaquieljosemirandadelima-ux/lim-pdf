export type LanguageCode = "pt-BR" | "en" | "es";

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
  { code: "pt-BR", label: "Portuguese", nativeLabel: "Português", shortLabel: "PT", flagCode: "br" },
  { code: "en", label: "English", nativeLabel: "English", shortLabel: "EN", flagCode: "us" },
  { code: "es", label: "Spanish", nativeLabel: "Español", shortLabel: "ES", flagCode: "es" },
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
