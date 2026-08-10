"use client";

import { Button } from "@dango/ui/components/button";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export function SessionComplete() {
  const { t } = useTranslation();

  return (
    <section className="mt-10">
      <p className="text-sm font-semibold text-primary">{t("sessionCompleteStatus")}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{t("sessionCompleteTitle")}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("sessionCompleteHint")}</p>
      <Button className="mt-8" asChild>
        <Link href="/mined">{t("goToMined")}</Link>
      </Button>
    </section>
  );
}
