import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase, type Database } from "@/db";
import { user } from "@/db/schema/auth";
import { capture, generation, generationUsage } from "@/db/schema/mining";
import { approveCapture } from "./approvals";
import { createCapture, listCaptures } from "./captures";
import { MiningError } from "./errors";
import { generateCapture } from "./generations";

const ANA = "user-ana";
const BIA = "user-bia";
const CAPTURE_ID = "439bc2dd-7d16-46aa-90d9-4d1d45e52a9f";
const GENERATION_ID = "86c0d68f-2de1-403f-b902-28f40fc66b24";
const APPROVAL_ID = "994faed4-c57c-4f69-824e-41dc03f5063d";

describe("PWA mining", () => {
  let container: StartedPostgreSqlContainer;
  let closeDatabase: () => Promise<void>;
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    const connection = createDatabase(container.getConnectionUri());
    closeDatabase = () => connection.client.end();
    database = connection.db;
    await migrate(database, { migrationsFolder: "drizzle" });
    await database.insert(user).values([
      { email: "ana@example.com", emailVerified: true, id: ANA, name: "Ana" },
      { email: "bia@example.com", emailVerified: true, id: BIA, name: "Bia" },
    ]);
  }, 60_000);

  afterAll(async () => {
    await closeDatabase();
    await container.stop();
  });

  it("isolates, generates with fallback, and approves without duplicate decisions", async () => {
    const input = {
      id: CAPTURE_ID,
      originalSentence: "He thought he could get away with lying.",
      source: "Série",
      text: "get away with",
    };
    const first = await createCapture(database, ANA, input);
    const replay = await createCapture(database, ANA, input);

    expect(replay.id).toBe(first.id);
    expect(await listCaptures(database, BIA)).toEqual([]);
    await expect(createCapture(database, BIA, input)).rejects.toMatchObject({
      code: "CAPTURE_ID_CONFLICT",
    });

    const generator = vi
      .fn()
      .mockRejectedValueOnce(new Error("provedor indisponível"))
      .mockResolvedValueOnce({
        output: {
          explanation: "Significa escapar das consequências de uma ação.",
          sentences: [
            "He cannot get away with that excuse.",
            "She tried to get away with paying less.",
            "They will not get away with cheating.",
            "I cannot believe he got away with it.",
            "Do you think we can get away with leaving early?",
          ],
          translation: "sair impune",
        },
        usage: {
          inputTokens: 10,
          latencyMs: 20,
          outputTokens: 30,
          reportedCostUsd: "0.001",
        },
      });

    const generated = await generateCapture(database, ANA, CAPTURE_ID, GENERATION_ID, generator, {
      dailyLimit: null,
      operationTimeoutMs: 60_000,
    });

    expect(generator.mock.calls.map(([call]) => call.model)).toEqual([
      "openai/gpt-5-mini",
      "google/gemini-2.5-flash",
    ]);
    expect(generated.status).toBe("ready_for_review");
    expect(generated.generation?.model).toBe("google/gemini-2.5-flash");
    expect(await database.select().from(generationUsage).where(eq(generationUsage.userId, ANA))).toHaveLength(2);

    const approvalInput = {
      generationId: GENERATION_ID,
      id: APPROVAL_ID,
      sentence: generated.generation!.sentences[0],
      source: "generated" as const,
    };
    const approved = await approveCapture(database, ANA, CAPTURE_ID, approvalInput);
    const approvalReplay = await approveCapture(database, ANA, CAPTURE_ID, approvalInput);

    expect(approved.status).toBe("approved");
    expect(approvalReplay.approval).toEqual(approved.approval);
    await expect(approveCapture(database, BIA, CAPTURE_ID, approvalInput)).rejects.toMatchObject({
      code: "CAPTURE_NOT_FOUND",
    });
  }, 60_000);

  it("restores the capture after failure and applies the configured limit", async () => {
    const failedCaptureId = "b404a89e-d4bb-4c87-8814-8e2b0e34567a";
    await createCapture(database, BIA, {
      id: failedCaptureId,
      originalSentence: null,
      source: null,
      text: "brush up on",
    });
    const failingGenerator = vi.fn().mockRejectedValue(new Error("falha"));

    await expect(
      generateCapture(
        database,
        BIA,
        failedCaptureId,
        "912118ab-cc34-43d1-a8ec-e02b1b49e325",
        failingGenerator,
        { dailyLimit: null, operationTimeoutMs: 60_000 },
      ),
    ).rejects.toMatchObject({ code: "GENERATION_FAILED" });
    expect((await listCaptures(database, BIA))[0].status).toBe("inbox");

    const limitedCaptureId = "0dd51894-8451-4c0e-b91d-5d434092427c";
    await createCapture(database, BIA, {
      id: limitedCaptureId,
      originalSentence: null,
      source: null,
      text: "come across",
    });
    await expect(
      generateCapture(
        database,
        BIA,
        limitedCaptureId,
        "30025ff3-5218-4239-a34b-5b02bebcfadb",
        failingGenerator,
        { dailyLimit: 1, operationTimeoutMs: 60_000 },
      ),
    ).rejects.toMatchObject({ code: "GENERATION_LIMIT_REACHED" });
  }, 60_000);

  it("rejects reuse of a completed operation with another capture", async () => {
    await expect(
      generateCapture(database, ANA, "00000000-0000-4000-8000-000000000000", GENERATION_ID, vi.fn(), {
        dailyLimit: null,
        operationTimeoutMs: 60_000,
      }),
    ).rejects.toBeInstanceOf(MiningError);
  });

  it("recovers an interrupted reservation after the lease expires", async () => {
    const captureId = "7da73cef-257f-45c4-997c-bda9e4347bb8";
    const interruptedId = "e24a8db0-22a9-46ff-b7a1-bd5885e6c6c2";
    await createCapture(database, ANA, {
      id: captureId,
      originalSentence: null,
      source: null,
      text: "look forward to",
    });
    await database.insert(generation).values({
      captureId,
      id: interruptedId,
      leaseExpiresAt: new Date(0),
      model: "openai/gpt-5-mini",
      promptVersion: "sentence-mining-v1",
      userId: ANA,
    });
    await database.update(capture).set({ status: "generating" }).where(eq(capture.id, captureId));

    const recovered = await generateCapture(
      database,
      ANA,
      captureId,
      "a79b682b-83da-4883-96cc-395991314e02",
      vi.fn().mockResolvedValue({
        output: {
          explanation: "Esperar algo com expectativa.",
          sentences: [
            "I look forward to seeing you.",
            "We look forward to the trip.",
            "They look forward to working together.",
            "She looks forward to every lesson.",
            "Do you look forward to going home?",
          ],
          translation: "aguardar com expectativa",
        },
        usage: {
          inputTokens: null,
          latencyMs: 1,
          outputTokens: null,
          reportedCostUsd: null,
        },
      }),
      { dailyLimit: null, operationTimeoutMs: 60_000 },
    );

    expect(recovered.status).toBe("ready_for_review");
    expect(
      await database.select().from(generation).where(eq(generation.id, interruptedId)),
    ).toMatchObject([{ errorCode: "INTERRUPTED", status: "failed" }]);
  });

  it("prevents an expired worker from overwriting its replacement", async () => {
    const captureId = "03878eec-a210-4826-be40-641968d8f13c";
    const expiredId = "cabf8c76-f1d2-42ba-8195-6ae871f0e89f";
    const replacementId = "8e41c900-316d-4279-ae49-ce4100b63b1e";
    await createCapture(database, ANA, {
      id: captureId,
      originalSentence: null,
      source: null,
      text: "figure out",
    });

    let releaseExpired!: () => void;
    let markStarted!: () => void;
    const release = new Promise<void>((resolve) => {
      releaseExpired = resolve;
    });
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const expiredGenerator = vi.fn().mockImplementation(async () => {
      markStarted();
      await release;
      throw new Error("worker antigo falhou");
    });
    const expiredWorker = generateCapture(
      database,
      ANA,
      captureId,
      expiredId,
      expiredGenerator,
      { dailyLimit: null, operationTimeoutMs: 60_000 },
    );
    await started;
    await database
      .update(generation)
      .set({ leaseExpiresAt: new Date(0) })
      .where(eq(generation.id, expiredId));

    const replacement = await generateCapture(
      database,
      ANA,
      captureId,
      replacementId,
      vi.fn().mockResolvedValue({
        output: {
          explanation: "Entender ou resolver algo.",
          sentences: [
            "I need to figure out the answer.",
            "She will figure out what happened.",
            "We can figure out a better route.",
            "They tried to figure out the puzzle.",
            "Can you figure out how this works?",
          ],
          translation: "descobrir ou entender",
        },
        usage: {
          inputTokens: null,
          latencyMs: 1,
          outputTokens: null,
          reportedCostUsd: null,
        },
      }),
      { dailyLimit: null, operationTimeoutMs: 60_000 },
    );
    releaseExpired();

    await expect(expiredWorker).rejects.toMatchObject({ code: "GENERATION_EXPIRED" });
    expect(expiredGenerator).toHaveBeenCalledTimes(1);
    expect(replacement.status).toBe("ready_for_review");
    expect((await listCaptures(database, ANA)).find((item) => item.id === captureId)).toMatchObject({
      generation: { id: replacementId },
      status: "ready_for_review",
    });
  });
});
