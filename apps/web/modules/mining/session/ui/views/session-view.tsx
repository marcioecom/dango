"use client";

import { Button } from "@dango/ui/components/button";
import { Skeleton } from "@dango/ui/components/skeleton";
import { useTranslation } from "react-i18next";

import { useMiningSession } from "../../hooks/use-mining-session";
import { SessionComplete } from "../components/session-complete";
import { ReviewView } from "../../../review/ui/views/review-view";

export function SessionView({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const {
    captures,
    current,
    currentIndex,
    decision,
    session,
    sessionCaptures,
  } = useMiningSession(sessionId);

  if (
    (session.isLoading && !session.data) ||
    (captures.isLoading && !captures.data)
  ) {
    return <Skeleton className="mt-10 h-72 w-full" />;
  }
  if (session.isError || captures.isError || !session.data || !captures.data) {
    return (
      <p className="mt-10 text-sm text-destructive" role="alert">
        {t("sessionLoadError")}
      </p>
    );
  }
  if (!current) {
    return <SessionComplete />;
  }

  return (
    <>
      <p className="text-sm font-medium text-muted-foreground">
        {t("sessionProgress", {
          current: currentIndex + 1,
          total: sessionCaptures.length,
        })}
      </p>
      <ReviewView captureId={current.id} key={current.id} />
      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          type="button"
          variant="ghost"
          disabled={decision.isPending}
          onClick={() =>
            decision.mutate({ action: "defer", captureId: current.id })
          }
        >
          {t("defer")}
        </Button>
        <Button
          size="sm"
          type="button"
          variant="ghost"
          disabled={decision.isPending}
          onClick={() =>
            decision.mutate({ action: "discard", captureId: current.id })
          }
        >
          {t("discard")}
        </Button>
        {decision.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {t("decisionError")}
          </p>
        ) : null}
      </div>
    </>
  );
}
