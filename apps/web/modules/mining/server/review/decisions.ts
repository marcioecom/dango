import { and, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { approvals, captures } from "@/db/schema/mining";

import { getCapture } from "../../shared/server/captures";
import { MiningError } from "../../shared/server/errors";

export async function decideCapture(
  database: Database,
  userId: string,
  captureId: string,
  action: "defer" | "discard" | "restore" | "undo_approval",
) {
  await database.transaction(async (transaction) => {
    const [captureRow] = await transaction
      .select()
      .from(captures)
      .where(and(eq(captures.id, captureId), eq(captures.userId, userId)));
    if (!captureRow) throw new MiningError("CAPTURE_NOT_FOUND", "Captura não encontrada.", 404);

    if (action === "undo_approval") {
      if (captureRow.status !== "approved") {
        throw new MiningError("APPROVAL_NOT_FOUND", "Esta captura não está aprovada.", 409);
      }
      await transaction.delete(approvals).where(and(eq(approvals.captureId, captureId), eq(approvals.userId, userId)));
      await transaction
        .update(captures)
        .set({ status: "ready_for_review", updatedAt: new Date() })
        .where(and(eq(captures.id, captureId), eq(captures.userId, userId)));
      return;
    }

    const nextStatus = { defer: "deferred", discard: "discarded", restore: "ready_for_review" }[action];
    if (action === "restore" && !["deferred", "discarded"].includes(captureRow.status)) {
      throw new MiningError("CAPTURE_NOT_ARCHIVED", "Esta captura não está adiada ou descartada.", 409);
    }
    if (action !== "restore" && captureRow.status !== "ready_for_review") {
      throw new MiningError("CAPTURE_NOT_READY", "Escolha uma captura pronta para revisão.", 409);
    }
    await transaction
      .update(captures)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(and(eq(captures.id, captureId), eq(captures.userId, userId)));
  });

  return getCapture(database, userId, captureId);
}
