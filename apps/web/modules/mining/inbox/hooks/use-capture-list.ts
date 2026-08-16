"use client";

import type { Capture } from "@dango/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createMiningSession, generateCaptures } from "@/modules/mining/shared/hooks/api";
import { miningQueryKeys } from "@/modules/mining/shared/hooks/query-keys";
import { capturesQuery } from "@/modules/mining/shared/hooks/queries";

const inboxStatuses: Capture["status"][] = [
  "inbox",
  "generating",
  "ready_for_review",
  "deferred",
  "discarded",
];

export function useCaptureList() {
  const query = useQuery(capturesQuery);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const captures = query.data?.captures.filter((capture) => inboxStatuses.includes(capture.status));
  const eligibleCaptures = captures?.filter((capture) => capture.status === "inbox") ?? [];
  const readyCaptures = captures?.filter((capture) => capture.status === "ready_for_review") ?? [];
  const selectedCaptureIds = eligibleCaptures
    .filter((capture) => selectedIds.has(capture.id))
    .map((capture) => capture.id);

  const generateMany = useMutation({
    mutationFn: (captureIds: string[]) => generateCaptures(captureIds, crypto.randomUUID()),
    onSuccess: async () => {
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: miningQueryKeys.captures });
    },
  });
  const startSession = useMutation({
    mutationFn: () =>
      createMiningSession({
        captureIds: readyCaptures.map((capture) => capture.id),
        id: crypto.randomUUID(),
      }),
    onSuccess: (created) => router.push(`/sessions/${created.id}`),
  });

  function toggleCapture(captureId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(captureId);
      else next.delete(captureId);
      return next;
    });
  }

  function generateAll() {
    generateMany.mutate(eligibleCaptures.map((capture) => capture.id));
  }

  function generateSelected() {
    generateMany.mutate(selectedCaptureIds);
  }

  function startReviewSession() {
    startSession.mutate();
  }

  return {
    captures,
    eligibleCaptures,
    generateAll,
    generateMany,
    generateSelected,
    query,
    readyCaptures,
    selectedCaptureIds,
    selectedIds,
    startReviewSession,
    startSession,
    toggleCapture,
  };
}
