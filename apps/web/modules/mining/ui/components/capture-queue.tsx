"use client";

import type { Capture } from "@dango/domain";
import { Button } from "@dango/ui/components/button";
import { Skeleton } from "@dango/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { capturesQuery } from "../../hooks/queries";
import { useGenerateCapture } from "../../hooks/use-generate-capture";

export function CaptureQueue() {
  const { t } = useTranslation();
  const query = useQuery(capturesQuery);

  return (
    <section className="mt-14" aria-labelledby="queue-title">
      <h2 id="queue-title" className="text-xl font-semibold tracking-[-0.025em]">
        {t("inboxTitle")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("inboxHint")}</p>

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

      {query.data?.captures.length === 0 ? (
        <div className="mt-6 border-y border-border py-8">
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : null}

      {query.data?.captures.length ? (
        <div className="mt-6 divide-y divide-border border-y border-border">
          {query.data.captures.map((capture) => (
            <QueueItem capture={capture} key={capture.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function QueueItem({ capture }: { capture: Capture }) {
  const { t } = useTranslation();
  const generation = useGenerateCapture(capture.id);
  const status = {
    approved: t("readyForAnki"),
    generating: t("statusGenerating"),
    inbox: t("statusInbox"),
    ready_for_review: t("statusReady"),
  }[capture.status];

  return (
    <article className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold break-words">{capture.text}</h3>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{status}</p>
          {capture.approval ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {capture.approval.sentence}
            </p>
          ) : null}
        </div>
        {capture.status === "inbox" ? (
          <Button
            className="shrink-0"
            type="button"
            size="sm"
            variant="secondary"
            disabled={generation.isPending}
            onClick={() => generation.mutate()}
          >
            {generation.isPending ? t("generating") : t("generate")}
          </Button>
        ) : null}
        {capture.status === "ready_for_review" ? (
          <Button className="shrink-0" size="sm" asChild>
            <Link href={`/inbox/${capture.id}`}>{t("review")}</Link>
          </Button>
        ) : null}
        {capture.status === "generating" ? (
          <Button className="shrink-0" size="sm" variant="outline" asChild>
            <Link href={`/inbox/${capture.id}`}>{t("tryAgain")}</Link>
          </Button>
        ) : null}
      </div>
      {generation.isError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t("generateError")}
        </p>
      ) : null}
    </article>
  );
}
