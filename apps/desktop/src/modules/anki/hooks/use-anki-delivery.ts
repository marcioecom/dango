import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent } from "react";

import {
  getAnkiCatalog,
  getAnkiStatus,
  listAnkiDeliveries,
  loadAnkiProfile,
  saveAnkiProfile,
} from "../native";
import { synchronizeAnki } from "../sync";
import type { AnkiProfile } from "../types";

const RETRY_INTERVAL_MS = 10_000;

export function useAnkiDelivery(accountId: string) {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryFn: getAnkiStatus,
    queryKey: ["anki", "status"],
    refetchInterval: RETRY_INTERVAL_MS,
  });
  const profile = useQuery({
    queryFn: () => loadAnkiProfile(accountId),
    queryKey: ["anki", "profile", accountId],
  });
  const catalog = useQuery({
    enabled: status.data?.connected === true,
    queryFn: getAnkiCatalog,
    queryKey: ["anki", "catalog"],
  });
  const deliveries = useQuery({
    queryFn: () => listAnkiDeliveries(accountId),
    queryKey: ["anki", "deliveries", accountId],
  });
  const sync = useMutation({
    mutationFn: () => synchronizeAnki(accountId),
    onSuccess: (items) => {
      queryClient.setQueryData(["anki", "deliveries", accountId], items);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["anki", "deliveries", accountId] });
    },
  });
  const saveProfile = useMutation({
    mutationFn: (input: AnkiProfile) => saveAnkiProfile(input),
    onSuccess: (saved) => {
      queryClient.setQueryData(["anki", "profile", accountId], saved);
      sync.mutate();
    },
  });
  const runSync = useEffectEvent(() => {
    if (!sync.isPending) sync.mutate();
  });

  useEffect(() => {
    runSync();
    const interval = window.setInterval(runSync, RETRY_INTERVAL_MS);
    window.addEventListener("focus", runSync);
    window.addEventListener("online", runSync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", runSync);
      window.removeEventListener("online", runSync);
    };
  }, [accountId]);

  return { catalog, deliveries, profile, saveProfile, status, sync };
}
