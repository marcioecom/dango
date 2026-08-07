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
	"explanation" text,
	"translation" text,
	"sentences" jsonb,
	"error_code" text,
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
ALTER TABLE "approval" ADD CONSTRAINT "approval_capture_id_capture_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."capture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture" ADD CONSTRAINT "capture_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation" ADD CONSTRAINT "generation_capture_id_capture_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."capture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation" ADD CONSTRAINT "generation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_usage" ADD CONSTRAINT "generation_usage_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_usage" ADD CONSTRAINT "generation_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approval_user_capture_idx" ON "approval" USING btree ("user_id","capture_id");--> statement-breakpoint
CREATE INDEX "approval_user_approved_idx" ON "approval" USING btree ("user_id","approved_at");--> statement-breakpoint
CREATE INDEX "capture_user_status_updated_idx" ON "capture" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "capture_user_normalized_text_idx" ON "capture" USING btree ("user_id","normalized_text");--> statement-breakpoint
CREATE INDEX "generation_user_capture_created_idx" ON "generation" USING btree ("user_id","capture_id","created_at");--> statement-breakpoint
CREATE INDEX "generation_usage_user_created_idx" ON "generation_usage" USING btree ("user_id","created_at");