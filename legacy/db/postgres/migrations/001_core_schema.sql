-- GrowthOS PostgreSQL Schema — Section 6.4
-- Core relational data: users, workspaces, integrations, intelligence, billing
-- Uses UUIDs as primary keys throughout, row-level security for tenant isolation.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ===== Users & Authentication =====
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mfa_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL, -- 'totp', 'sms'
  secret_encrypted TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  key_hash TEXT NOT NULL,
  label TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- ===== Workspace & Access =====
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT, -- 'marketing_agency', 'ecommerce', 'in_house'
  country TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer', -- owner, admin, manager, viewer, client
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE (workspace_id, user_id)
);

-- ===== Integrations =====
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'google_ads', 'meta_ads', 'gsc', 'ga4', 'shopify'
  status TEXT DEFAULT 'disconnected', -- connected, disconnected, error
  external_account_id TEXT,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ
);

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id UUID REFERENCES platform_connections(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== Intelligence =====
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  bridge_type TEXT NOT NULL, -- SEO->GoogleAds, GoogleAds->SEO, Meta->SEO, SEO->Meta
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  impact TEXT NOT NULL, -- High, Medium, Low
  status TEXT DEFAULT 'pending', -- pending, actioned, dismissed
  created_at TIMESTAMPTZ DEFAULT now(),
  actioned_at TIMESTAMPTZ
);

CREATE TABLE insight_loops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  input_snapshot JSONB
);

CREATE TABLE budget_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  from_channel TEXT NOT NULL,
  to_channel TEXT NOT NULL,
  amount NUMERIC(12,2),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== Billing =====
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'starter', -- starter, growth, scale
  status TEXT DEFAULT 'trialing',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount NUMERIC(12,2),
  status TEXT,
  issued_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  metric TEXT NOT NULL, -- 'api_calls', 'ai_creatives_generated'
  quantity INT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Row-level security (tenant isolation) — Section 6.4 / 5.4.
-- missing_ok=true means: if no workspace context is set on the connection,
-- the policy evaluates to false (zero rows) rather than throwing an error —
-- fails safe, so a bug that forgets to set the session variable blocks
-- access instead of leaking data.
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON recommendations
  USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

-- Email verification — added during dress-up pass
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
