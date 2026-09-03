CREATE TABLE "creative_experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"hypothesis" text NOT NULL,
	"variant_a" jsonb NOT NULL,
	"variant_b" jsonb NOT NULL,
	"variant_a_label" text DEFAULT 'Variant A' NOT NULL,
	"variant_b_label" text DEFAULT 'Variant B' NOT NULL,
	"success_metric" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"result" jsonb,
	"created_by" text,
	"started_at" timestamp with time zone,
	"concluded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "creative_experiments_ws_status_idx" ON "creative_experiments" USING btree ("workspace_id","status");