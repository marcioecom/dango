import { localeNames, supportedLocales, type SupportedLocale } from "@dango/i18n";
import { LanguageSelect } from "@dango/ui/components/language-select";
import { useTranslation } from "react-i18next";

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const locale: SupportedLocale = i18n.resolvedLanguage?.startsWith("pt") ? "pt-BR" : "en";

  return (
    <LanguageSelect
      label={t("language.label")}
      onValueChange={(nextLocale) => i18n.changeLanguage(nextLocale)}
      options={supportedLocales.map((value) => ({ label: localeNames[value], value }))}
      value={locale}
    />
  );
}
