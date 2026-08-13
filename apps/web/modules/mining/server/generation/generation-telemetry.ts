import { gateway } from "@ai-sdk/gateway";

export async function fetchReportedCostUsd(
  generationId: unknown,
): Promise<string | null> {
  if (typeof generationId !== "string") return null;
  try {
    const info = await gateway.getGenerationInfo({ id: generationId });
    return String(info.totalCost);
  } catch {
    return null;
  }
}
