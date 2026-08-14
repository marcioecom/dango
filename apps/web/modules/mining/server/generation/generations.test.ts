import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { runWithConcurrency } from "./generations";

describe("runWithConcurrency", () => {
  it("processes every item and never exceeds the concurrency limit", async () => {
    const items = Array.from({ length: 10 }, (_, index) => index);
    const processed: number[] = [];
    let active = 0;
    let peak = 0;

    await runWithConcurrency(items, 4, async (item) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      processed.push(item);
    });

    expect(processed.sort((a, b) => a - b)).toEqual(items);
    expect(peak).toBe(4);
  });

  it("settles when a worker throws", async () => {
    await expect(
      runWithConcurrency([1], 4, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
