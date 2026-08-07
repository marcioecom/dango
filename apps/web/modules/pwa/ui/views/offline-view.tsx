"use client";

import { BrandMark } from "@dango/ui/components/brand-mark";
import { useTranslation } from "react-i18next";

export function OfflineView() {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-svh place-items-center px-5 py-10">
      <section className="w-full max-w-sm" aria-labelledby="offline-title">
        <div className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
          <BrandMark className="size-9" />
          <span>Dango</span>
        </div>
        <p className="mt-12 text-sm font-semibold text-warning">{t("offlineStatus")}</p>
        <h1 id="offline-title" className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-balance">
          {t("offlineTitle")}
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          {t("offlineDescription")}
        </p>
      </section>
    </main>
  );
}
