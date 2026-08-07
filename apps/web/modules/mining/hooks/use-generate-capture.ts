"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { ApiError, generateCapture } from "./api";
import { miningQueryKeys } from "./query-keys";

export function useGenerateCapture(captureId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const operationId = useRef<string | null>(null);

  return useMutation({
    mutationFn: async () => {
      operationId.current ??= crypto.randomUUID();
      return generateCapture(captureId, operationId.current);
    },
    onSuccess: async () => {
      operationId.current = null;
      await queryClient.invalidateQueries({ queryKey: miningQueryKeys.captures });
      router.push(`/inbox/${captureId}`);
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        (error.status < 500 || error.code === "GENERATION_FAILED") &&
        error.code !== "GENERATION_RUNNING"
      ) {
        operationId.current = null;
      }
    },
  });
}
