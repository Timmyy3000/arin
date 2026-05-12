ALTER TABLE "stages" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stage_not_both_won_lost" CHECK (NOT ("stages"."is_won" AND "stages"."is_lost"));