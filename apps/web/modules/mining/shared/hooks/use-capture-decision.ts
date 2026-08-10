"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type CaptureDecisionAction, decideCapture } from "./api";
import { miningQueryKeys } from "./query-keys";

export function useCaptureDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, captureId }: { action: CaptureDecisionAction; captureId: string }) =>
      decideCapture(captureId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: miningQueryKeys.captures }),
  });
}
