ALTER TABLE "generation" DROP COLUMN "explanation";
ALTER TABLE "generation" DROP COLUMN "translation";
ALTER TABLE "generation" DROP COLUMN "sentences";
ALTER TABLE "generation" ADD COLUMN "ambiguity_note_pt_br" text;
ALTER TABLE "generation" ADD COLUMN "examples" jsonb;
ALTER TABLE "generation" ADD COLUMN "explanation_pt_br" text;
ALTER TABLE "generation" ADD COLUMN "translations_pt_br" jsonb;
