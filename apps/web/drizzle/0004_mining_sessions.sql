CREATE TABLE "mining_session" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "mining_session_user_created_idx" ON "mining_session" USING btree ("user_id", "created_at");

CREATE TABLE "mining_session_item" (
  "session_id" uuid NOT NULL REFERENCES "mining_session"("id") ON DELETE CASCADE,
  "capture_id" uuid NOT NULL REFERENCES "capture"("id") ON DELETE CASCADE,
  "position" integer NOT NULL,
  PRIMARY KEY ("session_id", "capture_id")
);
