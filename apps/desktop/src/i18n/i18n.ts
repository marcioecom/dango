import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { resources } from "./resources";

export const supportedLocales = ["pt-BR", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

const LANGUAGE_STORAGE_KEY = "anki-miner.language";

export function normalizeLocale(language: string | null | undefined): SupportedLocale | null {
  if (!language) return null;
  const normalizedLanguage = language.toLowerCase();
  if (normalizedLanguage.startsWith("pt")) return "pt-BR";
  if (normalizedLanguage.startsWith("en")) return "en";
  return null;
}

export function detectInitialLocale(): SupportedLocale {
  const storedLocale = normalizeLocale(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  if (storedLocale) return storedLocale;

  for (const language of navigator.languages) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }

  return "pt-BR";
}

void i18n.use(initReactI18next).init({
  fallbackLng: "pt-BR",
  initAsync: false,
  interpolation: { escapeValue: false },
  lng: detectInitialLocale(),
  resources,
  supportedLngs: supportedLocales,
});

i18n.on("languageChanged", (language) => {
  const locale = normalizeLocale(language) ?? "pt-BR";
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  document.documentElement.lang = locale;
});

document.documentElement.lang = i18n.resolvedLanguage ?? "pt-BR";

export { i18n };
