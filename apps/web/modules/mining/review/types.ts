import type { ApprovalSource, Capture } from "@dango/domain";

export type ReviewCapture = Capture & { generation: NonNullable<Capture["generation"]> };

export type ReviewOption = {
  generatedPosition: number | null;
  key: string;
  sentence: string;
  source: Extract<ApprovalSource, "generated" | "original">;
  targetForm: string;
  translation: string | null;
};
