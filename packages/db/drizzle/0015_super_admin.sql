CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "platform_role" text;--> statement-breakpoint
CREATE INDEX "idx_admin_audit_actor" ON "admin_audit_log" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_target" ON "admin_audit_log" USING btree ("target_type","target_id");