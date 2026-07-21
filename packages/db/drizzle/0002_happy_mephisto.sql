CREATE TABLE "onboarding_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"crawl_summary" jsonb,
	"strategy" jsonb,
	"generated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "onboarding_analyses_workspace_uidx" UNIQUE("workspace_id")
);
