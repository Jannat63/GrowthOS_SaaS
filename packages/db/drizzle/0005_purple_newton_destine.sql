CREATE TABLE "intelligence_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"period_start" text NOT NULL,
	"report" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "intelligence_reports_workspace_period_uidx" UNIQUE("workspace_id","period_start")
);
