"use client";

import { defaultLocale, detectInitialLocale, normalizeLocale, persistLocale } from "@dango/i18n";
import i18n from "i18next";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";

import { resources } from "./resources";

i18n.use(initReactI18next).init({
  fallbackLng: defaultLocale,
  initAsync: false,
  interpolation: { escapeValue: false },
  lng: defaultLocale,
  resources,
  supportedLngs: Object.keys(resources),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    function handleLanguageChange(nextLanguage: string) {
      const locale = normalizeLocale(nextLanguage) ?? defaultLocale;
      persistLocale(locale);
    }

    i18n.on("languageChanged", handleLanguageChange);
    i18n.changeLanguage(detectInitialLocale());

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
