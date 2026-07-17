CREATE TABLE "content_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"recommendation_id" uuid,
	"keyword" text NOT NULL,
	"source" text NOT NULL,
	"source_data" jsonb,
	"brief" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_url" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "snoozed_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "acted_at" timestamp with time zone;