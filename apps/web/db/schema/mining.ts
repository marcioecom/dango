import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const capture = pgTable(
  "capture",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    normalizedText: text("normalized_text").notNull(),
    originalSentence: text("original_sentence"),
    source: text("source"),
    status: text("status").default("inbox").notNull(),
    ...timestamps,
  },
  (table) => [
    index("capture_user_status_updated_idx").on(table.userId, table.status, table.updatedAt),
    index("capture_user_normalized_text_idx").on(table.userId, table.normalizedText),
  ],
);

export const generation = pgTable(
  "generation",
  {
    id: uuid("id").primaryKey(),
    captureId: uuid("capture_id")
      .notNull()
      .references(() => capture.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").default("running").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    explanation: text("explanation"),
    translation: text("translation"),
    sentences: jsonb("sentences").$type<string[]>(),
    errorCode: text("error_code"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("generation_user_capture_created_idx").on(table.userId, table.captureId, table.createdAt)],
);

export const generationUsage = pgTable(
  "generation_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    generationId: uuid("generation_id")
      .notNull()
      .references(() => generation.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    outcome: text("outcome").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    reportedCostUsd: text("reported_cost_usd"),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("generation_usage_user_created_idx").on(table.userId, table.createdAt)],
);

export const approval = pgTable(
  "approval",
  {
    id: uuid("id").primaryKey(),
    captureId: uuid("capture_id")
      .notNull()
      .references(() => capture.id, { onDelete: "cascade" }),
    generationId: uuid("generation_id")
      .notNull()
      .references(() => generation.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sentence: text("sentence").notNull(),
    source: text("source").notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("approval_user_capture_idx").on(table.userId, table.captureId),
    index("approval_user_approved_idx").on(table.userId, table.approvedAt),
  ],
);

export const miningSchema = { approval, capture, generation, generationUsage };
