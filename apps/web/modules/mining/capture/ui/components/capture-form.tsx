"use client";

import { Button } from "@dango/ui/components/button";
import { Input } from "@dango/ui/components/input";
import { Label } from "@dango/ui/components/label";
import { useTranslation } from "react-i18next";

import { useCaptureForm } from "../../hooks/use-capture-form";
import { CaptureSavedNotice } from "./capture-saved-notice";

export function CaptureForm() {
  const { t } = useTranslation();
  const {
    dismissSavedCapture, // --
    errors,
    handleSubmit,
    kind,
    register,
    save,
    savedCaptureId, // --
  } = useCaptureForm();

  return (
    <section aria-labelledby="capture-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1
            id="capture-title"
            className="text-2xl font-semibold tracking-[-0.03em]"
          >
            {t("captureTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("captureHint")}
          </p>
        </div>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={handleSubmit((values) => save.mutate(values))}
      >
        <fieldset>
          <legend className="sr-only">{t("captureKindLabel")}</legend>
          <div className="grid grid-cols-2 rounded-md border border-border p-1">
            <label className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                value="sentence"
                {...register("kind")}
              />
              <span className="flex h-10 items-center justify-center rounded-sm text-sm font-medium text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground">
                {t("captureKindSentence")}
              </span>
            </label>
            <label className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                value="term"
                {...register("kind")}
              />
              <span className="flex h-10 items-center justify-center rounded-sm text-sm font-medium text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground">
                {t("captureKindTerm")}
              </span>
            </label>
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="capture-text">
            {kind === "sentence" ? t("sentenceToRemember") : t("target")}
          </Label>
          <Input
            id="capture-text"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder={
              kind === "sentence"
                ? t("sentencePlaceholder")
                : t("targetPlaceholder")
            }
            aria-invalid={Boolean(errors.text)}
            {...register("text")}
          />
        </div>
        {kind === "term" ? (
          <div className="space-y-2">
            <Label htmlFor="original-sentence">
              {t("originalSentence")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("optional")})
              </span>
            </Label>
            <textarea
              id="original-sentence"
              rows={3}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground hover:border-foreground/35 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:text-sm"
              {...register("originalSentence")}
            />
          </div>
        ) : null}
        {/* TODO: remove source input it's not been used */}
        <div className="space-y-2">
          <Label htmlFor="source">
            {t("source")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("optional")})
            </span>
          </Label>
          <Input id="source" {...register("source")} />
        </div>

        {save.isError ? (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {t("captureError")}
          </p>
        ) : null}

        <Button className="w-full" type="submit" disabled={save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </form>

      {/* TODO: use toaser instead of notice */}
      {savedCaptureId ? (
        <CaptureSavedNotice
          captureId={savedCaptureId}
          onDismiss={dismissSavedCapture}
        />
      ) : null}
    </section>
  );
}
