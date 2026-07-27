CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"created_by" text,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "api_keys_key_hash_uidx" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE INDEX "idx_api_keys_workspace" ON "api_keys" USING btree ("workspace_id");