"use client";

import type { Capture } from "@dango/domain";
import { Button } from "@dango/ui/components/button";
import { Skeleton } from "@dango/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { createMiningSession, decideCapture, generateCaptures } from "../../hooks/api";
import { miningQueryKeys } from "../../hooks/query-keys";
import { capturesQuery } from "../../hooks/queries";
import { useGenerateCapture } from "../../hooks/use-generate-capture";

export function CaptureList({ status }: { status: "inbox" | "mined" }) {
  const { t } = useTranslation();
  const query = useQuery(capturesQuery);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const captures = query.data?.captures.filter((capture) =>
    status === "mined"
      ? capture.status === "approved"
      : ["inbox", "generating", "ready_for_review", "deferred", "discarded"].includes(capture.status),
  );
  const eligibleCaptures = captures?.filter((capture) => capture.status === "inbox") ?? [];
  const readyCaptures = captures?.filter((capture) => capture.status === "ready_for_review") ?? [];
  const selectedCaptureIds = eligibleCaptures
    .filter((capture) => selectedIds.has(capture.id))
    .map((capture) => capture.id);
  const generateMany = useMutation({
    mutationFn: async (captureIds: string[]) => {
      await generateCaptures(captureIds, crypto.randomUUID());
    },
    onSuccess: async () => {
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: miningQueryKeys.captures });
    },
  });
  const session = useMutation({
    mutationFn: () =>
      createMiningSession({
        captureIds: readyCaptures.map((capture) => capture.id),
        id: crypto.randomUUID(),
      }),
    onSuccess: (created) => router.push(`/sessions/${created.id}`),
  });
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
          disabled={session.isPending}
          onClick={() => session.mutate()}
        >
          {session.isPending ? t("startingSession") : t("startReviewSession", { count: readyCaptures.length })}
        </Button>
      ) : null}
      {session.isError ? (
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
              onClick={() => generateMany.mutate(eligibleCaptures.map((capture) => capture.id))}
            >
              {generateMany.isPending ? t("generating") : t("generateAll")}
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={generateMany.isPending || selectedCaptureIds.length === 0}
              onClick={() => generateMany.mutate(selectedCaptureIds)}
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
            <QueueItem
              capture={capture}
              checked={selectedIds.has(capture.id)}
              key={capture.id}
              onCheckedChange={(checked) => {
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (checked) next.add(capture.id);
                  else next.delete(capture.id);
                  return next;
                });
              }}
              selectable={status === "inbox" && capture.status === "inbox"}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function QueueItem({
  capture,
  checked,
  onCheckedChange,
  selectable,
}: {
  capture: Capture;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  selectable: boolean;
}) {
  const { t } = useTranslation();
  const generation = useGenerateCapture(capture.id);
  const queryClient = useQueryClient();
  const decision = useMutation({
    mutationFn: (action: "restore" | "undo_approval") => decideCapture(capture.id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: miningQueryKeys.captures }),
  });
  const status = {
    approved: t("readyForAnki"),
    generating: t("statusGenerating"),
    inbox: t("statusInbox"),
    ready_for_review: t("statusReady"),
    deferred: t("statusDeferred"),
    discarded: t("statusDiscarded"),
  }[capture.status];

  return (
    <article className="py-4">
      <div className="flex items-start gap-3">
        {selectable ? (
          <input
            aria-label={t("selectCapture", { target: capture.text })}
            checked={checked}
            className="mt-1 size-4 shrink-0 accent-primary"
            onChange={(event) => onCheckedChange(event.target.checked)}
            type="checkbox"
          />
        ) : null}
        <div className="min-w-0">
          <h3 className="font-semibold break-words">{capture.text}</h3>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{status}</p>
          {capture.approval ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {capture.approval.sentence}
            </p>
          ) : null}
        </div>
        <div className="ml-auto shrink-0">
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
          {capture.status === "deferred" || capture.status === "discarded" ? (
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={decision.isPending}
              onClick={() => decision.mutate("restore")}
            >
              {t("restore")}
            </Button>
          ) : null}
          {capture.status === "approved" ? (
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={decision.isPending}
              onClick={() => decision.mutate("undo_approval")}
            >
              {t("undoApproval")}
            </Button>
          ) : null}
        </div>
      </div>
      {generation.isError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t("generateError")}
        </p>
      ) : null}
    </article>
  );
}
