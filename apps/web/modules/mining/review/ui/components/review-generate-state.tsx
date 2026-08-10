"use client";

import type { Capture } from "@dango/domain";
import { Button } from "@dango/ui/components/button";
import { useTranslation } from "react-i18next";

import { useGenerateCapture } from "../../../shared/hooks/use-generate-capture";

export function ReviewGenerateState({ capture, retry = false }: { capture: Capture; retry?: boolean }) {
  const { t } = useTranslation();
  const generation = useGenerateCapture(capture.id);

  return (
    <section className="mt-10">
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">{capture.text}</h1>
      <Button className="mt-8" onClick={() => generation.mutate()} disabled={generation.isPending}>
        {generation.isPending ? t("generating") : retry ? t("tryAgain") : t("generate")}
      </Button>
      {generation.isError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t("generateError")}
        </p>
      ) : null}
    </section>
  );
}
