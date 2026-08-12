import { z } from "zod";

export const ankiProfileSchema = z.object({
  accountId: z.string().min(1),
  backField: z.string().min(1),
  deckName: z.string().min(1),
  frontField: z.string().min(1),
  modelName: z.string().min(1),
});

export const ankiStatusSchema = z.object({
  connected: z.boolean(),
  errorCode: z.string().nullable(),
  message: z.string().nullable(),
  version: z.number().nullable(),
});

export const ankiCatalogSchema = z.object({
  decks: z.array(z.string()),
  models: z.array(
    z.object({
      fields: z.array(z.string()),
      name: z.string(),
    }),
  ),
});

export const ankiDeliveryStatusSchema = z.enum([
  "awaiting_remote_confirmation",
  "queued",
  "sending",
  "audio_failed",
  "anki_failed",
  "sent",
]);

export const ankiDeliverySchema = z.object({
  ankiNoteId: z.number().nullable(),
  approvalId: z.string(),
  approvedAt: z.string(),
  captureId: z.string(),
  deliveredAt: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  remoteSentSyncedAt: z.string().nullable(),
  status: ankiDeliveryStatusSchema,
});

export const processedDeliveriesSchema = z.object({
  deliveries: z.array(ankiDeliverySchema),
});

export type AnkiCatalog = z.infer<typeof ankiCatalogSchema>;
export type AnkiDelivery = z.infer<typeof ankiDeliverySchema>;
export type AnkiProfile = z.infer<typeof ankiProfileSchema>;
export type AnkiStatus = z.infer<typeof ankiStatusSchema>;

export class AnkiCommandError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "AnkiCommandError";
  }
}
