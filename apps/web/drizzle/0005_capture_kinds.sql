ALTER TABLE "capture" ADD COLUMN "kind" text DEFAULT 'term' NOT NULL;
ALTER TABLE "generation" ADD COLUMN "original_sentence_translation_pt_br" text;
ALTER TABLE "generation" ADD COLUMN "sentence_translation_pt_br" text;
