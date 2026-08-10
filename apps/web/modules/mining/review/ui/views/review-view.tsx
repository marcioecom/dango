"use client";

import type { Capture } from "@dango/domain";
import { Skeleton } from "@dango/ui/components/skeleton";
import { useTranslation } from "react-i18next";

import { useCapture } from "../../../shared/hooks/use-capture";
import type { ReviewCapture } from "../../types";
import { ReviewApprovedState } from "../components/review-approved-state";
import { ReviewForm } from "../components/review-form";
import { ReviewGenerateState } from "../components/review-generate-state";

function hasGeneration(capture: Capture): capture is ReviewCapture {
  return capture.generation !== null;
}

export function ReviewView({ captureId }: { captureId: string }) {
  const { t } = useTranslation();
  const { capture, query } = useCapture(captureId);

  if (query.isLoading && !query.data) {
    return <Skeleton className="mt-10 h-72 w-full" />;
  }
  if (query.isError || !capture) {
    return (
      <div className="mt-10 rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">
        {query.error?.message ?? t("captureNotFound")}
      </div>
    );
  }
  if (capture.status === "inbox") {
    return <ReviewGenerateState capture={capture} />;
  }
  if (capture.status === "generating" || !hasGeneration(capture)) {
    return <ReviewGenerateState capture={capture} retry />;
  }
  if (capture.status === "approved" && capture.approval) {
    return <ReviewApprovedState sentence={capture.approval.sentence} text={capture.text} />;
  }
  return <ReviewForm capture={capture} />;
}
