import { z } from "zod";

import type { GenerationOutput } from "@dango/domain";

import { EXAMPLE_COUNT } from "./generation-prompt";

const strictNullableText = z.string().trim().min(1).nullable();

const strictExampleSchema = z.object({
  sentenceEn: z.string().trim().min(1),
  targetForm: z.string().trim().min(1),
  translationPtBr: z.string().trim().min(1),
});

const strictItemSchema = z.object({
  ambiguityNotePtBr: strictNullableText,
  captureId: z.uuid(),
  examples: z.array(strictExampleSchema).length(EXAMPLE_COUNT),
  explanationPtBr: z.string().trim().min(1),
  originalSentenceTranslationPtBr: strictNullableText,
  sentenceTranslationPtBr: strictNullableText,
  translationsPtBr: z.array(z.object({ text: z.string().trim().min(1) })),
});

export const generationResponseSchema = z.object({
  items: z.array(strictItemSchema).min(1),
});

export type GenerationResponseItem = z.infer<typeof strictItemSchema>;

export function toGenerationOutput(
  item: GenerationResponseItem,
): GenerationOutput {
  return {
    ambiguityNotePtBr: item.ambiguityNotePtBr ?? undefined,
    examples: item.examples,
    explanationPtBr: item.explanationPtBr,
    originalSentenceTranslationPtBr:
      item.originalSentenceTranslationPtBr ?? undefined,
    sentenceTranslationPtBr: item.sentenceTranslationPtBr ?? undefined,
    translationsPtBr: item.translationsPtBr,
  };
}
