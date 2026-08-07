"use client";

import { localeNames, supportedLocales } from "@dango/i18n";
import { LanguageSelect } from "@dango/ui/components/language-select";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith("pt") ? "pt-BR" : "en";

  return (
    <LanguageSelect
      label={t("languageLabel")}
      onValueChange={(nextLanguage) => i18n.changeLanguage(nextLanguage)}
      options={supportedLocales.map((value) => ({ label: localeNames[value], value }))}
      value={language}
    />
  );
}
