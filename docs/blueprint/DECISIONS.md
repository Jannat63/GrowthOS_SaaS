# GrowthOS — Locked Decisions (Amendments to the Blueprint)

**Date:** 2026-07-05
**Status:** Authoritative. Where any other blueprint doc (ARCHITECTURE, PRD, ENGINEERING,
ROADMAP, REPO_SETUP, GETTING_STARTED, API_SPEC, DATA_MODELS) conflicts with a decision below,
**this document wins.**

These decisions were made while restructuring the existing GrowthOS build onto the blueprint stack.

---

## D1 — Authentication: Better Auth (not Supabase)

- Authentication uses **Better Auth** (TypeScript-native), running inside `apps/api` (Fastify).
- Better Auth **owns its own tables** in Neon (`user`, `session`, `account`, `verification`),
  created and migrated via Drizzle — the same database as all app data.
- **Workspaces / members / roles** use Better Auth's **organization plugin** (organization ≈ workspace,
  member ≈ workspace_member). The blueprint's `workspaces` / `workspace_members` tables are reconciled
  with the organization plugin during implementation.
- The frontend (`apps/web`) uses the **Better Auth client**.
- **Supabase is not used anywhere** — not for auth, not as a database. Every "Supabase Auth",
  "supabase_jwt", `@supabase/*`, and `SUPABASE_*` reference in the other docs means **Better Auth** instead:
  - API auth header: `Authorization: Bearer <better_auth_session_token>` (or session cookie).
  - RLS policies written against Supabase's `auth.uid()` do not apply; workspace isolation is enforced
    at the application layer in the Fastify api (validated `workspace_id` on every query), with
    Postgres constraints as backup.
- The previous custom bcrypt/JWT auth (in `/legacy`) is reference-only.

## D2 — Database: Neon only, one Postgres for everything

- **Neon Postgres** is the single relational database: app data **and** Better Auth tables.
- Accessed through **Drizzle ORM** (`packages/db`). No second Postgres provider.

## D3 — Maximize free tiers; defer paid/hosted extras

- Use the **free tier** of every hosted service: Neon (Postgres), Upstash (Redis / job broker),
  Cloudflare R2 (object storage) — added only when a feature needs it.
- **ClickHouse** runs **locally via Docker** during development. ClickHouse Cloud is deferred until scale.
- **Upstash Kafka** (event streaming) is deferred — not needed for MVP; Redis pub/sub covers early needs.
- No paid service is a hard dependency to run the app locally in early slices.

## D4 — Claude / Anthropic API: deferred

- The current build does **not** use the Claude API. Content briefs, recommendation explanations, and
  the weekly report use **deterministic / template logic** (carried forward from `/legacy`).
- Claude is an **optional later upgrade** behind a feature flag: if `ANTHROPIC_API_KEY` is set, use it;
  otherwise fall back to deterministic logic. Nothing breaks without a key.

## D5 — Repo & migration shape

- The existing codebase is preserved under **`/legacy`** in the `GrowthOS_SaaS` repo (reference-only).
- The new **Turborepo + pnpm** structure is built at the repo root (`apps/web`, `apps/api`,
  `apps/worker`, `packages/*`) per ARCHITECTURE.md.
- The existing **frontend is carried forward** (not rebuilt) and migrated incrementally: re-pointed to
  the new Fastify api, adopting shadcn/ui + Tailwind v4 over time.
- Full detail: `GrowthOS_SaaS/docs/superpowers/specs/2026-07-05-restructure-design.md`.

---

## Quick substitution key (applies to all other docs)

| Doc says | Read as |
|---|---|
| Supabase Auth / `@supabase/supabase-js` / `@supabase/ssr` | Better Auth (server + client) |
| `Authorization: Bearer <supabase_jwt>` | `Authorization: Bearer <better_auth_session_token>` (or cookie) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (+ optional OAuth creds) |
| `auth.uid()` RLS policies | application-layer workspace filtering in the Fastify api |
| ClickHouse Cloud | local ClickHouse via Docker (dev) |
| Upstash Kafka | deferred |
| Anthropic / Claude API | deferred; deterministic logic, Claude optional behind a flag |
