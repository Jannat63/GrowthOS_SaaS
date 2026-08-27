CREATE TABLE "brand_guidelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"tone" text DEFAULT 'professional' NOT NULL,
	"banned_terms" text[] DEFAULT '{}' NOT NULL,
	"required_disclaimers" text[] DEFAULT '{}' NOT NULL,
	"value_props" text[] DEFAULT '{}' NOT NULL,
	"target_persona" text,
	"reading_level" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_guidelines_workspace_id_unique" UNIQUE("workspace_id")
);
