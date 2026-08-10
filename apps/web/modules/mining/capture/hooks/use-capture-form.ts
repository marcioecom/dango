"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError, saveCapture } from "../../shared/hooks/api";
import { miningQueryKeys } from "../../shared/hooks/query-keys";

const captureFormSchema = z.object({
  kind: z.enum(["sentence", "term"]),
  originalSentence: z.string(),
  source: z.string(),
  text: z.string().trim().min(1),
});

type CaptureFormValues = z.infer<typeof captureFormSchema>;

export function useCaptureForm() {
  const queryClient = useQueryClient();
  const operationId = useRef<string | null>(null);
  const [savedCaptureId, setSavedCaptureId] = useState<string | null>(null);
  const form = useForm<CaptureFormValues>({
    defaultValues: { kind: "sentence", originalSentence: "", source: "", text: "" },
    resolver: zodResolver(captureFormSchema),
  });

  const save = useMutation({
    mutationFn: (values: CaptureFormValues) => {
      operationId.current ??= crypto.randomUUID();
      return saveCapture(
        values.kind === "sentence"
          ? { id: operationId.current, kind: "sentence", source: values.source, text: values.text }
          : {
              id: operationId.current,
              kind: "term",
              originalSentence: values.originalSentence,
              source: values.source,
              text: values.text,
            },
      );
    },
    onSuccess: async (capture, values) => {
      operationId.current = null;
      setSavedCaptureId(capture.id);
      form.reset({ kind: values.kind, originalSentence: "", source: "", text: "" });
      await queryClient.invalidateQueries({ queryKey: miningQueryKeys.captures });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) {
        operationId.current = null;
      }
    },
  });
  const kind = useWatch({ control: form.control, name: "kind" });

  return {
    dismissSavedCapture: () => setSavedCaptureId(null),
    errors: form.formState.errors,
    handleSubmit: form.handleSubmit,
    kind,
    register: form.register,
    save,
    savedCaptureId,
  };
}
