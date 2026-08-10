"use client";

import { Button } from "@dango/ui/components/button";
import { useTranslation } from "react-i18next";

import { useGenerateCapture } from "../../../shared/hooks/use-generate-capture";

export function CaptureSavedNotice({
  captureId,
  onDismiss,
}: {
  captureId: string;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const generation = useGenerateCapture(captureId);

  return (
    <div className="mt-5 rounded-lg bg-accent p-4" role="status">
      <p className="text-sm font-medium">{t("captureSaved")}</p>
      {generation.isError ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {t("generateError")}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => generation.mutate()} disabled={generation.isPending}>
          {generation.isPending ? t("generating") : t("generateNow")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDismiss}>
          {t("saveForLater")}
        </Button>
      </div>
    </div>
  );
}
