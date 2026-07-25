-- Seeds a fresh database with a demo account so the app isn't empty on
-- first run. Safe to re-run (ON CONFLICT DO NOTHING everywhere).
--
-- Usage: psql "$DATABASE_URL" -f db/postgres/seed.sql
--
-- Demo login after seeding: demo@growthos.app / DemoPass123
-- (password hash below corresponds to "DemoPass123" — generated with the
-- same bcrypt scheme as auth-service/app/security.py)

INSERT INTO workspaces (id, name, type, country, timezone)
VALUES ('1aa5f7aa-901b-4043-909b-fc3324faa506', 'Acme Inc.', 'ecommerce', 'BD', 'Asia/Dhaka')
ON CONFLICT (id) DO NOTHING;

-- password_hash below is a REAL bcrypt hash of "DemoPass123", generated and
-- verified with the same passlib/bcrypt scheme auth-service uses — tested
-- directly (bcrypt.verify('DemoPass123', this_hash) → True) before writing
-- it here, since a wrong or malformed hash would make the demo login fail.
INSERT INTO users (id, email, full_name, password_hash, email_verified)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'demo@growthos.app',
  'Demo User',
  '$2b$12$ahiaOJROayC33Hrl6uOK2eFnLc2fDMVsEZZKc7IFtdzr/0WfoIuhS',
  true
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '1aa5f7aa-901b-4043-909b-fc3324faa506',
  'a0000000-0000-0000-0000-000000000001',
  'owner',
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions (id, workspace_id, plan, status, trial_ends_at)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  '1aa5f7aa-901b-4043-909b-fc3324faa506',
  'growth',
  'trialing',
  now() + interval '14 days'
)
ON CONFLICT (id) DO NOTHING;
