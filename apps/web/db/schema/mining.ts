import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { GenerationExample, GenerationTranslation } from "@dango/domain";
import { users } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const captures = pgTable(
  "captures",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    kind: text("kind").default("term").notNull(),
    normalizedText: text("normalized_text").notNull(),
    originalSentence: text("original_sentence"),
    source: text("source"),
    status: text("status").default("inbox").notNull(),
    ...timestamps,
  },
  (table) => [
    index("captures_user_status_updated_idx").on(table.userId, table.status, table.updatedAt),
    index("captures_user_normalized_text_idx").on(table.userId, table.normalizedText),
  ],
);

export const generations = pgTable(
  "generations",
  {
    id: uuid("id").primaryKey(),
    captureId: uuid("capture_id")
      .notNull()
      .references(() => captures.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").default("running").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    ambiguityNotePtBr: text("ambiguity_note_pt_br"),
    examples: jsonb("examples").$type<GenerationExample[]>(),
    explanationPtBr: text("explanation_pt_br"),
    originalSentenceTranslationPtBr: text("original_sentence_translation_pt_br"),
    sentenceTranslationPtBr: text("sentence_translation_pt_br"),
    translationsPtBr: jsonb("translations_pt_br").$type<GenerationTranslation[]>(),
    errorCode: text("error_code"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("generations_user_capture_created_idx").on(table.userId, table.captureId, table.createdAt)],
);

export const generationUsages = pgTable(
  "generation_usages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    generationId: uuid("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    outcome: text("outcome").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    reportedCostUsd: text("reported_cost_usd"),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("generation_usages_user_created_idx").on(table.userId, table.createdAt)],
);

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey(),
    captureId: uuid("capture_id")
      .notNull()
      .references(() => captures.id, { onDelete: "cascade" }),
    generationId: uuid("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sentence: text("sentence").notNull(),
    source: text("source").notNull(),
    targetForm: text("target_form"),
    approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("approvals_user_capture_idx").on(table.userId, table.captureId),
    index("approvals_user_approved_idx").on(table.userId, table.approvedAt),
  ],
);

export const miningSessions = pgTable(
  "mining_sessions",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("mining_sessions_user_created_idx").on(table.userId, table.createdAt)],
);

export const miningSessionItems = pgTable(
  "mining_session_items",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => miningSessions.id, { onDelete: "cascade" }),
    captureId: uuid("capture_id")
      .notNull()
      .references(() => captures.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.captureId] })],
);

export const miningSchema = { approvals, captures, generationUsages, generations, miningSessionItems, miningSessions };
