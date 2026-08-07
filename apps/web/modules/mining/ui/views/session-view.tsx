"use client";

import { Button } from "@dango/ui/components/button";
import { Skeleton } from "@dango/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { decideCapture, getMiningSession } from "../../hooks/api";
import { miningQueryKeys } from "../../hooks/query-keys";
import { capturesQuery } from "../../hooks/queries";
import { ReviewView } from "./review-view";

export function SessionView({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const session = useQuery({
    queryFn: () => getMiningSession(sessionId),
    queryKey: miningQueryKeys.session(sessionId),
  });
  const captures = useQuery(capturesQuery);
  const decision = useMutation({
    mutationFn: ({ action, captureId }: { action: "defer" | "discard"; captureId: string }) =>
      decideCapture(captureId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: miningQueryKeys.captures }),
  });

  if ((session.isLoading && !session.data) || (captures.isLoading && !captures.data)) {
    return <Skeleton className="mt-10 h-72 w-full" />;
  }
  if (session.isError || captures.isError || !session.data || !captures.data) {
    return <p className="mt-10 text-sm text-destructive" role="alert">{t("sessionLoadError")}</p>;
  }

  const sessionCaptures = session.data.captureIds
    .map((captureId) => captures.data.captures.find((capture) => capture.id === captureId))
    .filter((capture) => capture !== undefined);
  const currentIndex = sessionCaptures.findIndex((capture) => capture.status === "ready_for_review");

  if (currentIndex === -1) {
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

  const current = sessionCaptures[currentIndex];
  return (
    <>
      <p className="text-sm font-medium text-muted-foreground">
        {t("sessionProgress", { current: currentIndex + 1, total: sessionCaptures.length })}
      </p>
      <ReviewView captureId={current.id} key={current.id} />
      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          type="button"
          variant="ghost"
          disabled={decision.isPending}
          onClick={() => decision.mutate({ action: "defer", captureId: current.id })}
        >
          {t("defer")}
        </Button>
        <Button
          size="sm"
          type="button"
          variant="ghost"
          disabled={decision.isPending}
          onClick={() => decision.mutate({ action: "discard", captureId: current.id })}
        >
          {t("discard")}
        </Button>
        {decision.isError ? <p className="text-sm text-destructive" role="alert">{t("decisionError")}</p> : null}
      </div>
    </>
  );
}
