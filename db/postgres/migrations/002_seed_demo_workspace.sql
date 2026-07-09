-- Seeds the fixed demo workspace referenced by apps/web/lib/hooks/useCrossChannelRecommendations.ts
-- (DEMO_WORKSPACE_ID). Without this, the intelligence-service's foreign key
-- constraint on recommendations.workspace_id rejects every insert — as
-- verified during backend testing. Replace this with real workspace
-- creation once auth is wired up.

INSERT INTO workspaces (id, name, type, country, timezone)
VALUES ('1aa5f7aa-901b-4043-909b-fc3324faa506', 'Acme Inc.', 'ecommerce', 'BD', 'Asia/Dhaka')
ON CONFLICT (id) DO NOTHING;
