"use client";

import type { Capture } from "@dango/domain";
import { useQuery } from "@tanstack/react-query";

import { getMiningSession } from "@/modules/mining/shared/hooks/api";
import { capturesQuery } from "@/modules/mining/shared/hooks/queries";
import { miningQueryKeys } from "@/modules/mining/shared/hooks/query-keys";
import { useCaptureDecision } from "@/modules/mining/shared/hooks/use-capture-decision";

export function useMiningSession(sessionId: string) {
  const session = useQuery({
    queryFn: () => getMiningSession(sessionId),
    queryKey: miningQueryKeys.session(sessionId),
  });
  const captures = useQuery(capturesQuery);
  const decision = useCaptureDecision();
  const sessionCaptures =
    session.data?.captureIds
      .map((captureId) => captures.data?.captures.find((capture) => capture.id === captureId))
      .filter((capture): capture is Capture => capture !== undefined) ?? [];
  const currentIndex = sessionCaptures.findIndex((capture) => capture.status === "ready_for_review");

  return {
    captures,
    current: currentIndex === -1 ? null : sessionCaptures[currentIndex],
    currentIndex,
    decision,
    session,
    sessionCaptures,
  };
}
