CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval" (
	"id" uuid PRIMARY KEY NOT NULL,
	"capture_id" uuid NOT NULL,
	"generation_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"sentence" text NOT NULL,
	"source" text NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capture" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"kind" text DEFAULT 'term' NOT NULL,
	"normalized_text" text NOT NULL,
	"original_sentence" text,
	"source" text,
	"status" text DEFAULT 'inbox' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"capture_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"ambiguity_note_pt_br" text,
	"examples" jsonb,
	"explanation_pt_br" text,
	"original_sentence_translation_pt_br" text,
	"sentence_translation_pt_br" text,
	"translations_pt_br" jsonb,
	"error_code" text,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"model" text NOT NULL,
	"outcome" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"reported_cost_usd" text,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mining_session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mining_session_item" (
	"session_id" uuid NOT NULL,
	"capture_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "mining_session_item_session_id_capture_id_pk" PRIMARY KEY("session_id","capture_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_capture_id_capture_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."capture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture" ADD CONSTRAINT "capture_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation" ADD CONSTRAINT "generation_capture_id_capture_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."capture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation" ADD CONSTRAINT "generation_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_usage" ADD CONSTRAINT "generation_usage_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_usage" ADD CONSTRAINT "generation_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mining_session" ADD CONSTRAINT "mining_session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mining_session_item" ADD CONSTRAINT "mining_session_item_session_id_mining_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mining_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mining_session_item" ADD CONSTRAINT "mining_session_item_capture_id_capture_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."capture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_user_capture_idx" ON "approval" USING btree ("user_id","capture_id");--> statement-breakpoint
CREATE INDEX "approval_user_approved_idx" ON "approval" USING btree ("user_id","approved_at");--> statement-breakpoint
CREATE INDEX "capture_user_status_updated_idx" ON "capture" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "capture_user_normalized_text_idx" ON "capture" USING btree ("user_id","normalized_text");--> statement-breakpoint
CREATE INDEX "generation_user_capture_created_idx" ON "generation" USING btree ("user_id","capture_id","created_at");--> statement-breakpoint
CREATE INDEX "generation_usage_user_created_idx" ON "generation_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "mining_session_user_created_idx" ON "mining_session" USING btree ("user_id","created_at");