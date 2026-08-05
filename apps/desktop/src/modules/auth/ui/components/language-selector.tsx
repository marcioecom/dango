import { NativeSelect } from "@dango/ui/components/native-select";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "../../../../i18n/i18n";

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const locale: SupportedLocale = i18n.resolvedLanguage?.startsWith("pt") ? "pt-BR" : "en";

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground lg:mt-6 lg:w-fit lg:flex-col lg:items-start">
      <span className="sr-only lg:not-sr-only">{t("language.label")}</span>
      <NativeSelect
        aria-label={t("language.label")}
        className="h-9 min-w-28 py-0 text-sm"
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        value={locale}
      >
        <option value="pt-BR">{t("language.portuguese")}</option>
        <option value="en">{t("language.english")}</option>
      </NativeSelect>
    </label>
  );
}
