"use client";

import { Button } from "@dango/ui/components/button";
import { Input } from "@dango/ui/components/input";
import { Label } from "@dango/ui/components/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { ApiError, saveCapture } from "../../hooks/api";
import { miningQueryKeys } from "../../hooks/query-keys";
import { useGenerateCapture } from "../../hooks/use-generate-capture";

const formSchema = z.object({
  originalSentence: z.string(),
  source: z.string(),
  text: z.string().trim().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function CaptureForm() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const operationId = useRef<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const generation = useGenerateCapture(savedId ?? "");
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<FormValues>({
    defaultValues: { originalSentence: "", source: "", text: "" },
    resolver: zodResolver(formSchema),
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      operationId.current ??= crypto.randomUUID();
      return saveCapture({
        id: operationId.current,
        originalSentence: values.originalSentence,
        source: values.source,
        text: values.text,
      });
    },
    onSuccess: async (capture) => {
      operationId.current = null;
      setSavedId(capture.id);
      reset();
      await queryClient.invalidateQueries({ queryKey: miningQueryKeys.captures });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) {
        operationId.current = null;
      }
    },
  });

  return (
    <section aria-labelledby="capture-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 id="capture-title" className="text-2xl font-semibold tracking-[-0.03em]">
            {t("captureTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("captureHint")}</p>
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <div className="space-y-2">
          <Label htmlFor="capture-text">{t("target")}</Label>
          <Input
            id="capture-text"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder={t("targetPlaceholder")}
            aria-invalid={Boolean(errors.text)}
            {...register("text")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="original-sentence">
            {t("originalSentence")} {" "}
            <span className="font-normal text-muted-foreground">({t("optional")})</span>
          </Label>
          <textarea
            id="original-sentence"
            rows={3}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground hover:border-foreground/35 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:text-sm"
            {...register("originalSentence")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">
            {t("source")} {" "}
            <span className="font-normal text-muted-foreground">({t("optional")})</span>
          </Label>
          <Input id="source" {...register("source")} />
        </div>

        {mutation.isError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {t("captureError")}
          </p>
        ) : null}

        <Button className="w-full" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("saving") : t("save")}
        </Button>
      </form>

      {savedId ? (
        <div className="mt-5 rounded-lg bg-accent p-4" role="status">
          <p className="text-sm font-medium">{t("captureSaved")}</p>
          {generation.isError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {t("generateError")}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => generation.mutate()} disabled={generation.isPending}>
              {generation.isPending ? t("generating") : t("generateNow")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSavedId(null)}>
              {t("saveForLater")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
