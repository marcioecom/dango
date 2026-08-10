"use client";

import type { Capture } from "@dango/domain";
import { Button } from "@dango/ui/components/button";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { useCaptureDecision } from "../../../shared/hooks/use-capture-decision";
import { useGenerateCapture } from "../../../shared/hooks/use-generate-capture";

export function CaptureListItem({
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
  const decision = useCaptureDecision();
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
              onClick={() => decision.mutate({ action: "restore", captureId: capture.id })}
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
              onClick={() => decision.mutate({ action: "undo_approval", captureId: capture.id })}
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
