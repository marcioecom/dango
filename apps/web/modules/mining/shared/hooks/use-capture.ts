"use client";

import { useQuery } from "@tanstack/react-query";

import { capturesQuery } from "./queries";

export function useCapture(captureId: string) {
  const query = useQuery(capturesQuery);

  return {
    capture: query.data?.captures.find((item) => item.id === captureId),
    query,
  };
}
