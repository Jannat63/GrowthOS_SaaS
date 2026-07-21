# P1.1 — packages/db (Drizzle + Neon)

Milestone: M1 · Depends on: P0.2 · Prerequisites: Neon connection string (URL)

## Goal

Create the shared `packages/db` on Drizzle + Neon with the tenancy schema and working migrations, so
every service reads and writes one real database.

## Subphases

- [ ] Create `packages/db` with dependencies: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`.
- [ ] Add `drizzle.config.ts`.
- [ ] Add the Neon client.
- [ ] Define the tenancy schema — `workspaces`, `workspace_members`, `platform_connections` —
  reconciled with Better Auth's tables.
- [ ] Generate and push the migration.
- [ ] (Optional) Add a demo seed.

## Reuse

- `legacy/db/postgres/migrations/001_core_schema.sql` → reference.
- `docs/blueprint/DATA_MODELS.md` → authoritative.

## Surface

- `packages/db/` — Drizzle setup, Neon client, `drizzle.config.ts`, schema.
- Tables: `workspaces`, `workspace_members`, `platform_connections` (reconciled with Better Auth).
- Migration files (generated + pushed).

## Verification

- `drizzle-kit push` succeeds against Neon.
- A query returns from the live database.
