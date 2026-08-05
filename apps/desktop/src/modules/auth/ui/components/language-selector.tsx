import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "../../../../i18n/i18n";

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const locale: SupportedLocale = i18n.resolvedLanguage?.startsWith("pt") ? "pt-BR" : "en";

  return (
    <label className="language-selector">
      <span>{t("language.label")}</span>
      <select
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        value={locale}
      >
        <option value="pt-BR">{t("language.portuguese")}</option>
        <option value="en">{t("language.english")}</option>
      </select>
    </label>
  );
}
