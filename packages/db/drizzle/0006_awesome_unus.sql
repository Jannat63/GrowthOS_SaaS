CREATE TABLE "recommendation_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "assigned_to" text;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "due_date" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_rec_comments_rec" ON "recommendation_comments" USING btree ("recommendation_id","created_at");