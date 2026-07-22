CREATE TABLE "automation_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"alert_type" text NOT NULL,
	"signature" text NOT NULL,
	"emitted_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "automation_alerts_ws_type_uidx" UNIQUE("workspace_id","alert_type")
);
--> statement-breakpoint
CREATE TABLE "scheduler_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"refreshed_count" integer DEFAULT 0 NOT NULL,
	"alert_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"details" jsonb
);
