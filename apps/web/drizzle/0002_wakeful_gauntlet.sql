ALTER TABLE "generation" ADD COLUMN "lease_expires_at" timestamp with time zone;
UPDATE "generation" SET "lease_expires_at" = "created_at" WHERE "lease_expires_at" IS NULL;
ALTER TABLE "generation" ALTER COLUMN "lease_expires_at" SET NOT NULL;
