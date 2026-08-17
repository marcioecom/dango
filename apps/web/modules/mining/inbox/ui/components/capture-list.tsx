"use client";

import type { Capture } from "@dango/domain";
import { Button } from "@dango/ui/components/button";
import { Skeleton } from "@dango/ui/components/skeleton";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useCaptureList } from "../../hooks/use-capture-list";
import { CaptureDetailDialog } from "./capture-detail-dialog";
import { CaptureListItem } from "./capture-list-item";

export function CaptureList() {
  const { t } = useTranslation();
  const [detailCapture, setDetailCapture] = useState<Capture | null>(null);
  const {
    captures,
    eligibleCaptures,
    generateAll,
    generateMany,
    generateSelected,
    query,
    readyCaptures,
    selectedCaptureIds,
    selectedIds,
    startReviewSession,
    startSession,
    toggleCapture,
  } = useCaptureList();

  return (
    <section aria-labelledby="capture-list-title">
      <h1 id="capture-list-title" className="text-2xl font-semibold tracking-[-0.03em]">
        {t("inboxTitle")}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("inboxHint")}</p>

      <div className="mt-6 border-y border-border py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm sm:flex-1 sm:gap-x-6">
            <div>
              <dt className="text-muted-foreground">{t("inboxStatsToReview")}</dt>
              <dd className="font-semibold">{readyCaptures.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("inboxStatsToGenerate")}</dt>
              <dd className="font-semibold">{eligibleCaptures.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("inboxStatsTotal")}</dt>
              <dd className="font-semibold">{captures?.length ?? 0}</dd>
            </div>
          </dl>
          {readyCaptures.length > 0 ? (
            <Button
              className="w-full shrink-0 sm:w-auto"
              type="button"
              disabled={startSession.isPending}
              onClick={startReviewSession}
            >
              {startSession.isPending
                ? t("startingSession")
                : t("startReviewSession", { count: readyCaptures.length })}
            </Button>
          ) : null}
        </div>

        {eligibleCaptures.length > 0 ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Button
                size="sm"
                type="button"
                variant="secondary"
                disabled={generateMany.isPending}
                onClick={generateAll}
              >
                {generateMany.isPending ? t("generating") : t("generateAll")}
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={generateMany.isPending || selectedCaptureIds.length === 0}
                onClick={generateSelected}
              >
                {t("generateSelected", { count: selectedCaptureIds.length })}
              </Button>
            </div>
            {generateMany.isError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {t("generateError")}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {startSession.isError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t("sessionStartError")}
        </p>
      ) : null}

      {query.isLoading && !query.data ? (
        <div className="mt-6 space-y-3" aria-label={t("inboxTitle")}>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {query.isError ? (
        <div className="mt-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          <p>{query.error.message}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => query.refetch()}>
            {t("tryAgain")}
          </Button>
        </div>
      ) : null}

      {captures?.length === 0 ? (
        <div className="mt-6 border-y border-border py-8">
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : null}

      {captures?.length ? (
        <div className="mt-6 divide-y divide-border border-y border-border">
          {captures.map((capture) => (
            <CaptureListItem
              capture={capture}
              checked={selectedIds.has(capture.id)}
              key={capture.id}
              onCheckedChange={(checked) => toggleCapture(capture.id, checked)}
              onOpenDetails={() => setDetailCapture(capture)}
              selectable={capture.status === "inbox"}
            />
          ))}
        </div>
      ) : null}

      {detailCapture ? (
        <CaptureDetailDialog
          capture={detailCapture}
          onClose={() => setDetailCapture(null)}
        />
      ) : null}
    </section>
  );
}
