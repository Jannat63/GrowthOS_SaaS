# P0.2 — API + web scaffold

Milestone: M0 · Depends on: P0.1 · Prerequisites: —

## Goal

Stand up the Turborepo monorepo with a runnable Fastify API and the existing frontend carried into
`apps/web`, so there is a green-building scaffold to build the platform on.

## Subphases

- [x] Create the Turborepo root (workspace + `turbo` pipeline).
- [x] Create `packages/config` (shared config).
- [x] Scaffold Fastify `apps/api` with a `/health` route and verify it responds.
- [x] Carry the existing frontend forward into `apps/web` and confirm it builds (80+ pages).

## Reuse

- Existing frontend → carried into `apps/web` (as-is, to be migrated incrementally later).

## Surface

- `apps/api/` — Fastify server with `GET /health`.
- `apps/web/` — carried-forward Next.js frontend (80+ pages).
- `packages/config/` — shared configuration.
- Turborepo root — workspace + `turbo build` pipeline.

## Verification

- `apps/api` `/health` endpoint verified responding.
- `apps/web` builds successfully.
- `turbo build` green across the workspace.
