"use client";

import { sentenceContainsTarget, type ApprovalSource, type Capture } from "@dango/domain";
import { Button } from "@dango/ui/components/button";
import { Skeleton } from "@dango/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiError, approveCapture } from "../../hooks/api";
import { miningQueryKeys } from "../../hooks/query-keys";
import { capturesQuery } from "../../hooks/queries";
import { useGenerateCapture } from "../../hooks/use-generate-capture";

export function ReviewView({ captureId }: { captureId: string }) {
  const { t } = useTranslation();
  const query = useQuery(capturesQuery);
  const capture = query.data?.captures.find((item) => item.id === captureId);

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
    return <GenerateState capture={capture} />;
  }
  if (capture.status === "generating") {
    return <GenerateState capture={capture} retry />;
  }
  if (capture.status === "approved" && capture.approval) {
    return (
      <section className="mt-10">
        <p className="text-sm font-semibold text-primary">{t("readyForAnki")}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{capture.text}</h1>
        <p className="mt-6 border-y border-border py-6 text-lg leading-8">{capture.approval.sentence}</p>
        <Button className="mt-8" variant="secondary" asChild>
          <Link href="/inbox">{t("backToQueue")}</Link>
        </Button>
      </section>
    );
  }
  return <ReviewForm capture={capture} />;
}

function GenerateState({ capture, retry = false }: { capture: Capture; retry?: boolean }) {
  const { t } = useTranslation();
  const generation = useGenerateCapture(capture.id);
  return (
    <section className="mt-10">
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">{capture.text}</h1>
      <Button className="mt-8" onClick={() => generation.mutate()} disabled={generation.isPending}>
        {generation.isPending ? t("generating") : retry ? t("tryAgain") : t("generate")}
      </Button>
      {generation.isError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t("generateError")}
        </p>
      ) : null}
    </section>
  );
}

function ReviewForm({ capture }: { capture: Capture }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const generation = capture.generation!;
  const originalIsValid = Boolean(
    capture.originalSentence && sentenceContainsTarget(capture.originalSentence, capture.text),
  );
  const options = [
    ...(originalIsValid && capture.originalSentence
      ? [{ key: "original", label: t("originalOption"), sentence: capture.originalSentence }]
      : []),
    ...generation.sentences.map((sentence, index) => ({
      key: `generated-${index}`,
      label: `${index + 1}`,
      sentence,
    })),
  ];
  const [selectedKey, setSelectedKey] = useState(options[0]?.key ?? "");
  const [sentence, setSentence] = useState(options[0]?.sentence ?? "");
  const [baseSentence, setBaseSentence] = useState(options[0]?.sentence ?? "");
  const [baseSource, setBaseSource] = useState<ApprovalSource>(
    options[0]?.key === "original" ? "original" : "generated",
  );
  const approvalId = useRef<string | null>(null);

  const approval = useMutation({
    mutationFn: () => {
      approvalId.current ??= crypto.randomUUID();
      return approveCapture(capture.id, {
        generationId: generation.id,
        id: approvalId.current,
        sentence,
        source: sentence === baseSentence ? baseSource : "edited",
      });
    },
    onSuccess: async () => {
      approvalId.current = null;
      await queryClient.invalidateQueries({ queryKey: miningQueryKeys.captures });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) {
        approvalId.current = null;
      }
    },
  });

  function choose(option: (typeof options)[number]) {
    const source = option.key === "original" ? "original" : "generated";
    setSelectedKey(option.key);
    setSentence(option.sentence);
    setBaseSentence(option.sentence);
    setBaseSource(source);
  }

  return (
    <section className="mt-10 pb-10" aria-labelledby="review-title">
      <p className="text-sm font-semibold text-primary">{capture.text}</p>
      <h1 id="review-title" className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-balance">
        {t("reviewTitle")}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("reviewHint")}</p>

      <div className="mt-7 bg-accent px-4 py-5">
        <p className="text-sm leading-6">{generation.explanation}</p>
        <p className="mt-3 text-sm font-medium">{generation.translation}</p>
      </div>

      <fieldset className="mt-7 divide-y divide-border border-y border-border">
        <legend className="sr-only">{t("reviewTitle")}</legend>
        {options.map((option) => (
          <label className="flex min-h-14 cursor-pointer items-start gap-3 py-4" key={option.key}>
            <input
              className="mt-1 size-4 accent-primary"
              type="radio"
              name="sentence-option"
              value={option.key}
              checked={selectedKey === option.key}
              onChange={() => choose(option)}
            />
            <span>
              <span className="block text-xs font-semibold text-muted-foreground">{option.label}</span>
              <span className="mt-1 block leading-7">{option.sentence}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="mt-7 block text-sm font-semibold" htmlFor="final-sentence">
        {t("selectedSentence")}
      </label>
      <textarea
        id="final-sentence"
        className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-base leading-7 outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        rows={4}
        value={sentence}
        onChange={(event) => setSentence(event.target.value)}
      />

      {approval.isError ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {t("approvalError")}
        </p>
      ) : null}
      <Button
        className="mt-5 w-full"
        type="button"
        disabled={approval.isPending || sentence.trim().length === 0}
        onClick={() => approval.mutate()}
      >
        {approval.isPending ? t("approving") : t("approve")}
      </Button>
    </section>
  );
}
