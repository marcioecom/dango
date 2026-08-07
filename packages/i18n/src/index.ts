export const defaultLocale = "pt-BR";
export const supportedLocales = [defaultLocale, "en"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const localeNames: Record<SupportedLocale, string> = {
  "pt-BR": "Português",
  en: "English",
};

export const languageStorageKey = "dango.language";

export function normalizeLocale(language: string | null | undefined): SupportedLocale | null {
  if (!language) return null;

  const normalizedLanguage = language.toLowerCase();
  if (normalizedLanguage.startsWith("pt")) return "pt-BR";
  if (normalizedLanguage.startsWith("en")) return "en";
  return null;
}

export function detectInitialLocale(): SupportedLocale {
  if (typeof window === "undefined") return defaultLocale;

  const storedLocale = normalizeLocale(window.localStorage.getItem(languageStorageKey));
  if (storedLocale) return storedLocale;

  for (const language of navigator.languages) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }

  return defaultLocale;
}

export function persistLocale(locale: SupportedLocale) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(languageStorageKey, locale);
  document.documentElement.lang = locale;
}
