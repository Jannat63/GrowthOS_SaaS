CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_status_code" integer,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"url" text NOT NULL,
	"secret_encrypted" text NOT NULL,
	"event_types" text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"disabled_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_due" ON "webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_endpoint" ON "webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_endpoints_workspace" ON "webhook_endpoints" USING btree ("workspace_id");