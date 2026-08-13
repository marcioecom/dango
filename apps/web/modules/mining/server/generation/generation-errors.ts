export class InvalidGenerationOutputError extends Error {
  readonly code = "INVALID_GENERATION_OUTPUT" as const;
}
