# M0 — Foundation & Restructure

Status: 🟨 In progress

## Goal

The new Turborepo stands up, the old code is preserved under `/legacy`, and the planning system is
in place — so all subsequent work has a clean monorepo, a runnable API/web scaffold, and an ordered
map to execute against.

## Phases

| Phase | Summary | Status |
|-------|---------|--------|
| [P0.1 Monorepo & legacy](./P0.1-monorepo-legacy/plan.md) | Move existing code into `/legacy`; import + amend blueprint docs; write `DECISIONS.md`. | [x] |
| [P0.2 API + web scaffold](./P0.2-api-web-scaffold/plan.md) | Turborepo root + `packages/config`; runnable Fastify `apps/api` (`/health` verified); `apps/web` carried forward and building. | [x] |
| [P0.3 Planning system](./P0.3-planning-system/plan.md) | This `docs/plan/` Milestone→Phase→Subphase structure with progress at every level. | [~] |

## Exit criteria

- `turbo build` green.
- `docs/plan/` populated.
- `PROGRESS.md` reflects reality.
