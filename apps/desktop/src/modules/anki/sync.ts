import type { ApprovedCard, ApprovedCardSyncIssue } from "@dango/domain";

import {
  listApprovedCards,
  markRemoteCardPending,
  markRemoteCardSent,
} from "./api";
import {
  enqueueAnkiDelivery,
  listAnkiDeliveries,
  markAnkiDeliveryPending,
  markAnkiDeliverySentSynced,
  processAnkiDeliveries,
} from "./native";
import type { AnkiDelivery } from "./types";

export type AnkiSyncDependencies = {
  enqueue: (accountId: string, card: ApprovedCard) => Promise<AnkiDelivery>;
  listLocal: (accountId: string) => Promise<AnkiDelivery[]>;
  listRemote: () => Promise<{ cards: ApprovedCard[]; issues: ApprovedCardSyncIssue[] }>;
  markLocalPending: (accountId: string, approvalId: string) => Promise<AnkiDelivery>;
  markLocalSentSynced: (accountId: string, approvalId: string) => Promise<AnkiDelivery>;
  markRemotePending: (captureId: string, approvalId: string) => Promise<unknown>;
  markRemoteSent: (captureId: string, approvalId: string) => Promise<unknown>;
  process: (accountId: string) => Promise<{ deliveries: AnkiDelivery[] }>;
};

const defaultDependencies: AnkiSyncDependencies = {
  enqueue: enqueueAnkiDelivery,
  listLocal: listAnkiDeliveries,
  listRemote: listApprovedCards,
  markLocalPending: markAnkiDeliveryPending,
  markLocalSentSynced: markAnkiDeliverySentSynced,
  markRemotePending: markRemoteCardPending,
  markRemoteSent: markRemoteCardSent,
  process: processAnkiDeliveries,
};

export async function synchronizeAnki(
  accountId: string,
  dependencies: AnkiSyncDependencies = defaultDependencies,
) {
  let firstError: unknown = null;
  let cards: ApprovedCard[] = [];
  try {
    const remote = await dependencies.listRemote();
    cards = remote.cards;
    if (remote.issues.length > 0) {
      firstError = new Error("Some approved cards require another review.");
    }
  } catch (error) {
    firstError = error;
  }

  for (const card of cards) {
    try {
      await dependencies.enqueue(accountId, card);
      if (card.remoteStatus === "approved") {
        await dependencies.markRemotePending(card.captureId, card.approvalId);
        await dependencies.markLocalPending(accountId, card.approvalId);
      }
    } catch (error) {
      firstError ??= error;
    }
  }

  let deliveries: AnkiDelivery[];
  try {
    ({ deliveries } = await dependencies.process(accountId));
  } catch (error) {
    firstError ??= error;
    deliveries = await dependencies.listLocal(accountId);
  }
  for (const delivery of deliveries) {
    if (delivery.status !== "sent" || delivery.remoteSentSyncedAt) continue;
    try {
      await dependencies.markRemoteSent(delivery.captureId, delivery.approvalId);
      await dependencies.markLocalSentSynced(accountId, delivery.approvalId);
    } catch (error) {
      firstError ??= error;
    }
  }

  const result = await dependencies.listLocal(accountId);
  if (firstError) throw firstError;
  return result;
}
