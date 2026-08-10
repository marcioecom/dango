"use client";

import { Button } from "@dango/ui/components/button";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export function ReviewApprovedState({ sentence, text }: { sentence: string; text: string }) {
  const { t } = useTranslation();

  return (
    <section className="mt-10">
      <p className="text-sm font-semibold text-primary">{t("readyForAnki")}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{text}</h1>
      <p className="mt-6 border-y border-border py-6 text-lg leading-8">{sentence}</p>
      <Button className="mt-8" variant="secondary" asChild>
        <Link href="/inbox">{t("backToQueue")}</Link>
      </Button>
    </section>
  );
}
