export const PROMPT_VERSION = "sentence-mining-v4";

export const EXAMPLE_COUNT = 5;

export type GenerationCaptureInput = {
  id: string;
  kind: "sentence" | "term";
  originalSentence: string | null;
  source: string | null;
  text: string;
};

export const GENERATION_SYSTEM_PROMPT = `Create concise English sentence-mining material for a Brazilian Portuguese learner.

# Meaning
- Use the meaning established by originalSentence when present; otherwise use the target's most common meaning.
- Explain exactly one meaning. Never mix or enumerate meanings.

# Content
- explanationPtBr: a brief Brazilian Portuguese paragraph about the chosen meaning.
- translationsPtBr: for a term, short Brazilian Portuguese equivalents only; for a sentence, an empty array. Never include examples or explanations.
- sentenceTranslationPtBr: full Brazilian Portuguese translation for a sentence; otherwise null.
- originalSentenceTranslationPtBr: Brazilian Portuguese translation when a term has originalSentence; otherwise null.
- examples: exactly 5 short, natural English sentences for the chosen meaning. Each must use the target or a grammatical inflection, name that exact substring in targetForm, and include a concise Brazilian Portuguese translation.
- ambiguityNotePtBr: a brief clarification only when context is absent and it genuinely helps; otherwise null.

# Output contract
- Return one item per captureId. Never omit or duplicate items.
- Return null for fields that do not apply.
- Return only the structured output, without markdown or commentary.`;

export const SENTENCE_GENERATION_SYSTEM_PROMPT = `Create one bilingual sentence-mining item for the supplied English sentence.

Translate the full sentence naturally into Brazilian Portuguese and briefly explain its meaning. Identify the most useful reusable English word or expression that carries that meaning. Return exactly five short, natural, distinct English examples that teach that reusable expression in the same sense. Each example must record the exact form used in targetForm and include a natural Brazilian Portuguese translation.

If the captured sentence is malformed or nonstandard, explain that briefly in ambiguityNotePtBr and teach the probable standard form instead of silently normalizing it.

Return translationsPtBr as an empty array and originalSentenceTranslationPtBr as null. Return only the structured output.`;

export function getGenerationSystemPrompt(kind: GenerationCaptureInput["kind"]) {
  return kind === "sentence"
    ? SENTENCE_GENERATION_SYSTEM_PROMPT
    : GENERATION_SYSTEM_PROMPT;
}

export function buildGenerationPrompt(captures: GenerationCaptureInput[]) {
  return JSON.stringify({
    captures: captures.map((capture) => ({
      ...capture,
      exampleCount: EXAMPLE_COUNT,
    })),
  });
}
