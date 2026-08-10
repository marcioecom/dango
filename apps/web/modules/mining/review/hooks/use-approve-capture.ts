"use client";

import type { ApproveCaptureInput } from "@dango/domain";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { ApiError, approveCapture } from "../../shared/hooks/api";
import { miningQueryKeys } from "../../shared/hooks/query-keys";

export function useApproveCapture(captureId: string) {
  const queryClient = useQueryClient();
  const approvalId = useRef<string | null>(null);

  return useMutation({
    mutationFn: (input: Omit<ApproveCaptureInput, "id">) => {
      approvalId.current ??= crypto.randomUUID();
      return approveCapture(captureId, { ...input, id: approvalId.current });
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
}
