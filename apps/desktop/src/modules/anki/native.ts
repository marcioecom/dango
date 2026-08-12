import type { ApprovedCard } from "@dango/domain";
import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

import {
  AnkiCommandError,
  ankiCatalogSchema,
  ankiDeliverySchema,
  ankiProfileSchema,
  ankiStatusSchema,
  processedDeliveriesSchema,
  type AnkiProfile,
} from "./types";

const commandErrorSchema = z.object({
  errorCode: z.string(),
  message: z.string(),
});

export async function getAnkiStatus() {
  return invokeAndParse("get_anki_status", ankiStatusSchema);
}

export async function getAnkiCatalog() {
  return invokeAndParse("get_anki_catalog", ankiCatalogSchema);
}

export async function loadAnkiProfile(accountId: string) {
  return invokeAndParse("load_anki_profile", ankiProfileSchema.nullable(), { accountId });
}

export async function saveAnkiProfile(profile: AnkiProfile) {
  return invokeAndParse("save_anki_profile", ankiProfileSchema, { profile });
}

export async function enqueueAnkiDelivery(accountId: string, card: ApprovedCard) {
  return invokeAndParse("enqueue_anki_delivery", ankiDeliverySchema, { accountId, card });
}

export async function markAnkiDeliveryPending(accountId: string, approvalId: string) {
  return invokeAndParse("mark_anki_delivery_pending", ankiDeliverySchema, {
    accountId,
    approvalId,
  });
}

export async function listAnkiDeliveries(accountId: string) {
  return invokeAndParse("list_anki_deliveries", z.array(ankiDeliverySchema), { accountId });
}

export async function processAnkiDeliveries(accountId: string) {
  return invokeAndParse("process_anki_deliveries", processedDeliveriesSchema, { accountId });
}

export async function markAnkiDeliverySentSynced(accountId: string, approvalId: string) {
  return invokeAndParse("mark_anki_delivery_sent_synced", ankiDeliverySchema, {
    accountId,
    approvalId,
  });
}

async function invokeAndParse<T>(
  command: string,
  schema: z.ZodType<T>,
  args?: Record<string, unknown>,
) {
  try {
    return schema.parse(await invoke(command, args));
  } catch (error) {
    const parsed = commandErrorSchema.safeParse(error);
    if (parsed.success) {
      throw new AnkiCommandError(parsed.data.errorCode, parsed.data.message);
    }
    if (error instanceof z.ZodError) {
      throw new AnkiCommandError("NATIVE_INVALID_RESPONSE", "Invalid native response.");
    }
    throw error;
  }
}
