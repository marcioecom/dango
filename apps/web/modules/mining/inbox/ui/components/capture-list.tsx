"use client";

import { Button } from "@dango/ui/components/button";
import { Skeleton } from "@dango/ui/components/skeleton";
import { useTranslation } from "react-i18next";

import { useCaptureList } from "../../hooks/use-capture-list";
import type { CaptureListStatus } from "../../types";
import { CaptureListItem } from "./capture-list-item";

export function CaptureList({ status }: { status: CaptureListStatus }) {
  const { t } = useTranslation();
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
  } = useCaptureList(status);
  const title = status === "mined" ? t("minedTitle") : t("inboxTitle");
  const hint = status === "mined" ? t("minedHint") : t("inboxHint");
  const emptyTitle = status === "mined" ? t("minedEmptyTitle") : t("emptyTitle");
  const emptyDescription = status === "mined" ? t("minedEmptyDescription") : t("emptyDescription");

  return (
    <section aria-labelledby="capture-list-title">
      <h1 id="capture-list-title" className="text-2xl font-semibold tracking-[-0.03em]">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{hint}</p>

      {status === "inbox" && readyCaptures.length > 0 ? (
        <Button
          className="mt-6"
          type="button"
          disabled={startSession.isPending}
          onClick={startReviewSession}
        >
          {startSession.isPending
            ? t("startingSession")
            : t("startReviewSession", { count: readyCaptures.length })}
        </Button>
      ) : null}
      {startSession.isError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t("sessionStartError")}
        </p>
      ) : null}

      {status === "inbox" && eligibleCaptures.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2 border-y border-border py-3">
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

      {query.isLoading && !query.data ? (
        <div className="mt-6 space-y-3" aria-label={title}>
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
          <p className="font-medium">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
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
              selectable={status === "inbox" && capture.status === "inbox"}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
