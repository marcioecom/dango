import { z } from "zod";

export const captureStatusSchema = z.enum([
  "inbox",
  "generating",
  "ready_for_review",
  "approved",
  "deferred",
  "discarded",
]);
export const captureKindSchema = z.enum(["sentence", "term"]);

const optionalCaptureText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();

export const createCaptureSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.uuid(),
    kind: z.literal("sentence"),
    source: optionalCaptureText,
    text: z.string().trim().min(1, "Digite uma frase."),
  }),
  z.object({
    id: z.uuid(),
    kind: z.literal("term"),
    originalSentence: optionalCaptureText,
    source: optionalCaptureText,
    text: z.string().trim().min(1, "Digite uma palavra ou expressão."),
  }),
]);

export const generationTranslationSchema = z.object({
  text: z.string().trim().min(1),
});

export const generationExampleSchema = z.object({
  sentenceEn: z.string().trim().min(1),
  targetForm: z.string().trim().min(1),
  translationPtBr: z.string().trim().min(1),
});

export const generationOutputSchema = z.object({
  ambiguityNotePtBr: z.string().trim().min(1).optional(),
  examples: z.array(generationExampleSchema).min(4).max(5),
  explanationPtBr: z.string().trim().min(1),
  translationsPtBr: z.array(generationTranslationSchema).default([]),
  originalSentenceTranslationPtBr: z.string().trim().min(1).optional(),
  sentenceTranslationPtBr: z.string().trim().min(1).optional(),
});

export const generationBatchOutputSchema = z.object({
  items: z.array(generationOutputSchema.extend({ captureId: z.uuid() })).min(1),
});

export const createGenerationSchema = z.object({
  id: z.uuid(),
});

export const approvalSourceSchema = z.enum(["generated", "original", "edited"]);

export const approveCaptureSchema = z.object({
  generationId: z.uuid(),
  id: z.uuid(),
  sentence: z.string().trim().min(1, "Escolha ou escreva uma frase."),
  source: approvalSourceSchema,
});

export const captureDecisionSchema = z.object({
  action: z.enum(["defer", "discard", "restore", "undo_approval"]),
});

export const generationSchema = generationOutputSchema.extend({
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  errorCode: z.string().nullable(),
  id: z.uuid(),
  model: z.string(),
  promptVersion: z.string(),
  status: z.enum(["running", "succeeded", "failed"]),
});

export const approvalSchema = z.object({
  approvedAt: z.string().datetime(),
  generationId: z.uuid(),
  id: z.uuid(),
  sentence: z.string(),
  source: approvalSourceSchema,
});

export const captureSchema = z.object({
  approval: approvalSchema.nullable(),
  createdAt: z.string().datetime(),
  generation: generationSchema.nullable(),
  id: z.uuid(),
  kind: captureKindSchema,
  originalSentence: z.string().nullable(),
  source: z.string().nullable(),
  status: captureStatusSchema,
  text: z.string(),
  updatedAt: z.string().datetime(),
});

export const captureListSchema = z.object({ captures: z.array(captureSchema) });

export const miningSessionSchema = z.object({
  captureIds: z.array(z.uuid()).min(1),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  id: z.uuid(),
});

export const createMiningSessionSchema = z.object({
  captureIds: z.array(z.uuid()).min(1),
  id: z.uuid(),
});

export type Approval = z.infer<typeof approvalSchema>;
export type ApprovalSource = z.infer<typeof approvalSourceSchema>;
export type ApproveCaptureInput = z.infer<typeof approveCaptureSchema>;
export type Capture = z.infer<typeof captureSchema>;
export type CaptureStatus = z.infer<typeof captureStatusSchema>;
export type CreateCaptureInput = z.infer<typeof createCaptureSchema>;
export type Generation = z.infer<typeof generationSchema>;
export type GenerationExample = z.infer<typeof generationExampleSchema>;
export type GenerationOutput = z.infer<typeof generationOutputSchema>;
export type GenerationTranslation = z.infer<typeof generationTranslationSchema>;
export type MiningSession = z.infer<typeof miningSessionSchema>;

export function sentenceContainsTarget(sentence: string, target: string) {
  const normalizedSentence = normalizeText(sentence);
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) {
    return false;
  }

  const escaped = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWithWord = /^[\p{L}\p{N}]/u.test(normalizedTarget);
  const endsWithWord = /[\p{L}\p{N}]$/u.test(normalizedTarget);
  const prefix = startsWithWord ? "(^|[^\\p{L}\\p{N}])" : "";
  const suffix = endsWithWord ? "(?=$|[^\\p{L}\\p{N}])" : "";
  return new RegExp(`${prefix}${escaped}${suffix}`, "u").test(normalizedSentence);
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
