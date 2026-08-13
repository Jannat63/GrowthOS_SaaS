CREATE TABLE "automation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"rule_id" uuid,
	"action_type" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"target" jsonb NOT NULL,
	"payload" jsonb NOT NULL,
	"previous_value" jsonb,
	"reason" text NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"action_type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"mode" text DEFAULT 'suggest' NOT NULL,
	"threshold" jsonb,
	"caps" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "automation_rules_ws_action_uidx" UNIQUE("workspace_id","action_type")
);
--> statement-breakpoint
CREATE INDEX "automation_actions_ws_status_idx" ON "automation_actions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "automation_actions_ws_created_idx" ON "automation_actions" USING btree ("workspace_id","created_at");