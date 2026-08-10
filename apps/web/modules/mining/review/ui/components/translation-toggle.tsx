"use client";

import { Button } from "@dango/ui/components/button";
import { useTranslation } from "react-i18next";

export function TranslationToggle({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  const { t } = useTranslation();

  return (
    <Button
      aria-pressed={expanded}
      className="mt-3"
      size="sm"
      type="button"
      variant="ghost"
      onClick={onClick}
    >
      {expanded ? t("hideExampleTranslations") : t("showExampleTranslations")}
    </Button>
  );
}
