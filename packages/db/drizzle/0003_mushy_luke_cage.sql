CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"type" text NOT NULL,
	"source_channel" text NOT NULL,
	"target_channel" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"action_label" text,
	"impact_score" integer NOT NULL,
	"effort_score" integer NOT NULL,
	"urgency_score" integer NOT NULL,
	"composite_score" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_recommendations_workspace" ON "recommendations" USING btree ("workspace_id","status");