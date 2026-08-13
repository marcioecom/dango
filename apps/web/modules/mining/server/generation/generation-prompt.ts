export const PROMPT_VERSION = "sentence-mining-v2";

export const EXAMPLE_COUNT = 5;

export type GenerationCaptureInput = {
  id: string;
  kind: "sentence" | "term";
  originalSentence: string | null;
  source: string | null;
  text: string;
};

export function buildGenerationSystemPrompt() {
  return [
    "You create natural English sentence-mining material for a Brazilian Portuguese learner.",
    "Choose one meaning for the target: the meaning established by the original sentence, or its most common meaning when no context is supplied.",
    "Write a short Brazilian Portuguese explanation for that one meaning only. Do not enumerate unrelated meanings.",
    "For a sentence capture, use sentenceTranslationPtBr for its full Brazilian Portuguese translation. For a term capture, return one or more Brazilian Portuguese translations as structured values, not a comma-separated sentence.",
    "For a term capture with originalSentence, include originalSentenceTranslationPtBr.",
    `Return exactly ${EXAMPLE_COUNT} varied, natural English examples. Each example must include the target or a grammatical inflection, identify the exact form used in targetForm, and include a Brazilian Portuguese translation.`,
    "Use ambiguityNotePtBr only when context is absent and a brief clarification genuinely helps.",
    "Return one item for every supplied captureId and do not omit or duplicate captureIds.",
    "Every field is required: use null for ambiguityNotePtBr, originalSentenceTranslationPtBr, and sentenceTranslationPtBr when they do not apply, and an empty array for translationsPtBr when there are no translations.",
    "Do not include markdown or commentary outside the structured output.",
  ].join(" ");
}

export function buildGenerationPrompt(captures: GenerationCaptureInput[]) {
  return JSON.stringify({
    captures: captures.map((capture) => ({
      ...capture,
      exampleCount: EXAMPLE_COUNT,
    })),
  });
}
