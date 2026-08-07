import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  defaultLocale,
  detectInitialLocale,
  normalizeLocale,
  persistLocale,
  supportedLocales,
  type SupportedLocale,
} from "@dango/i18n";
import { resources } from "./resources";

export { detectInitialLocale, normalizeLocale, supportedLocales, type SupportedLocale };

i18n.use(initReactI18next).init({
  fallbackLng: defaultLocale,
  initAsync: false,
  interpolation: { escapeValue: false },
  lng: detectInitialLocale(),
  resources,
  supportedLngs: supportedLocales,
});

i18n.on("languageChanged", (language) => {
  persistLocale(normalizeLocale(language) ?? defaultLocale);
});

persistLocale(normalizeLocale(i18n.resolvedLanguage) ?? defaultLocale);

export { i18n };
