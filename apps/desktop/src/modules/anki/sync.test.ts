import type { ApprovedCard } from "@dango/domain";
import { describe, expect, it, vi } from "vitest";

import { synchronizeAnki, type AnkiSyncDependencies } from "./sync";
import type { AnkiDelivery } from "./types";

const card: ApprovedCard = {
  approvalId: "53645f74-46c5-4027-b12b-dcda681ceea2",
  approvedAt: "2026-08-10T20:00:00.000Z",
  captureId: "f72e13df-b525-4f1d-a35d-8d9f2ad3ae63",
  remoteStatus: "approved",
  sentence: "She turned down the offer.",
  targetForm: "turned down",
  targetText: "turn down",
  translationsPtBr: ["recusar"],
};

const delivery: AnkiDelivery = {
  ankiNoteId: 42,
  approvalId: card.approvalId,
  approvedAt: card.approvedAt,
  captureId: card.captureId,
  deliveredAt: "2026-08-10T20:01:00.000Z",
  errorCode: null,
  errorMessage: null,
  remoteSentSyncedAt: null,
  status: "sent",
};

describe("Anki synchronization", () => {
  it("persists before acknowledging and acknowledges Anki after delivery", async () => {
    const calls: string[] = [];
    const dependencies = dependenciesFor(calls);

    await synchronizeAnki("account-1", dependencies);

    expect(calls).toEqual([
      "listRemote",
      "enqueue",
      "markRemotePending",
      "markLocalPending",
      "process",
      "markRemoteSent",
      "markLocalSentSynced",
      "listLocal",
    ]);
  });

  it("does not acknowledge pending twice when the backend already owns that state", async () => {
    const calls: string[] = [];
    const dependencies = dependenciesFor(calls);
    dependencies.listRemote = async () => {
      calls.push("listRemote");
      return { cards: [{ ...card, remoteStatus: "pending_anki" }], issues: [] };
    };

    await synchronizeAnki("account-1", dependencies);

    expect(calls).not.toContain("markRemotePending");
    expect(calls).not.toContain("markLocalPending");
  });

  it("continues processing a durable local queue while the backend is offline", async () => {
    const calls: string[] = [];
    const dependencies = dependenciesFor(calls);
    dependencies.listRemote = async () => {
      calls.push("listRemote");
      throw new Error("offline");
    };
    dependencies.process = async () => {
      calls.push("process");
      return { deliveries: [{ ...delivery, remoteSentSyncedAt: "already-synced" }] };
    };

    await expect(synchronizeAnki("account-1", dependencies)).rejects.toThrow("offline");
    expect(calls).toContain("process");
    expect(calls).toContain("listLocal");
  });
});

function dependenciesFor(calls: string[]): AnkiSyncDependencies {
  return {
    enqueue: vi.fn(async () => {
      calls.push("enqueue");
      return { ...delivery, status: "awaiting_remote_confirmation" as const };
    }),
    listLocal: vi.fn(async () => {
      calls.push("listLocal");
      return [delivery];
    }),
    listRemote: vi.fn(async () => {
      calls.push("listRemote");
      return { cards: [card], issues: [] };
    }),
    markLocalPending: vi.fn(async () => {
      calls.push("markLocalPending");
      return { ...delivery, status: "queued" as const };
    }),
    markLocalSentSynced: vi.fn(async () => {
      calls.push("markLocalSentSynced");
      return { ...delivery, remoteSentSyncedAt: "2026-08-10T20:02:00.000Z" };
    }),
    markRemotePending: vi.fn(async () => {
      calls.push("markRemotePending");
    }),
    markRemoteSent: vi.fn(async () => {
      calls.push("markRemoteSent");
    }),
    process: vi.fn(async () => {
      calls.push("process");
      return { deliveries: [delivery] };
    }),
  };
}
