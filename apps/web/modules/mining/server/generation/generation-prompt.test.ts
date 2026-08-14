import { describe, expect, it } from "vitest";

import {
  GENERATION_SYSTEM_PROMPT,
  getGenerationSystemPrompt,
  SENTENCE_GENERATION_SYSTEM_PROMPT,
} from "./generation-prompt";

describe("getGenerationSystemPrompt", () => {
  it("uses the proven production prompt for terms", () => {
    expect(getGenerationSystemPrompt("term")).toBe(GENERATION_SYSTEM_PROMPT);
  });

  it("uses the sentence-specific prompt for complete sentences", () => {
    expect(getGenerationSystemPrompt("sentence")).toBe(
      SENTENCE_GENERATION_SYSTEM_PROMPT,
    );
  });
});
