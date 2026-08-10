"use client";

import { Button } from "@dango/ui/components/button";
import { useTranslation } from "react-i18next";

import { useReviewForm } from "../../hooks/use-review-form";
import type { ReviewCapture } from "../../types";
import { SentenceOption } from "./sentence-option";
import { TranslationToggle } from "./translation-toggle";

export function ReviewForm({ capture }: { capture: ReviewCapture }) {
  const { t } = useTranslation();
  const {
    approval,
    approve,
    choose,
    generation,
    isSentence,
    options,
    selectedKey,
    sentence,
    setSentence,
    showContexts,
    showTranslations,
    toggleContexts,
    toggleTranslations,
  } = useReviewForm(capture);

  return (
    <section className="mt-10 pb-10" aria-labelledby="review-title">
      <p className="text-sm font-medium text-muted-foreground">
        {isSentence ? t("reviewSentenceLabel") : t("reviewTargetLabel")}
      </p>
      <h1 id="review-title" className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-balance">
        {capture.text}
      </h1>
      <div className="mt-7 border border-primary/30 bg-primary/10 px-5 py-5">
        <p className="text-base leading-7 text-foreground">{generation.explanationPtBr}</p>
        {isSentence ? (
          <p className="mt-4 text-sm font-semibold text-primary">{generation.sentenceTranslationPtBr}</p>
        ) : (
          <p className="mt-4 text-sm font-semibold text-primary">
            {generation.translationsPtBr.map((translation) => translation.text).join(", ")}
          </p>
        )}
        {generation.ambiguityNotePtBr ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{generation.ambiguityNotePtBr}</p>
        ) : null}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{isSentence ? t("otherContexts") : t("reviewTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("reviewHint")}</p>
        </div>
        {isSentence ? (
          <Button size="sm" type="button" variant="ghost" onClick={toggleContexts}>
            {showContexts ? t("hideOtherContexts") : t("showOtherContexts")}
          </Button>
        ) : null}
      </div>
      {showContexts ? <TranslationToggle expanded={showTranslations} onClick={toggleTranslations} /> : null}

      <fieldset className="mt-3 divide-y divide-border border-y border-border">
        <legend className="sr-only">{t("reviewTitle")}</legend>
        {(showContexts ? options : options.slice(0, 1)).map((option) => (
          <SentenceOption
            checked={selectedKey === option.key}
            key={option.key}
            label={
              option.generatedPosition === null
                ? isSentence
                  ? t("capturedSentence")
                  : t("originalOption")
                : String(option.generatedPosition)
            }
            onChoose={() => choose(option)}
            option={option}
            showTranslation={showTranslations}
          />
        ))}
      </fieldset>

      {showContexts ? <TranslationToggle expanded={showTranslations} onClick={toggleTranslations} /> : null}

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
        onClick={approve}
      >
        {approval.isPending ? t("approving") : t("approve")}
      </Button>
    </section>
  );
}
