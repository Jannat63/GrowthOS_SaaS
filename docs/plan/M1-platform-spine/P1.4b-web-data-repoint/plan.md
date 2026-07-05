# P1.4b — Web data re-point

Milestone: M1 · Depends on: P1.3 · Prerequisites: P1.3 (`/api/v1` routes live) · Runs after P1.3

## Goal

Point the `apps/web` data layer at the new Fastify `/api/v1`, replacing the dead `:8000` gateway base,
while preserving the graceful live→mock fallback so the app keeps rendering wherever a route isn't
built yet.

## Subphases

- [ ] Swap `apps/web/lib/api/client.ts` base URL to the Fastify `/api/v1`.
- [ ] Point the feature data hooks (`lib/hooks/*`) at the real endpoints.
- [ ] Keep the hooks' live→mock fallback + `DataSourceBadge` intact.

## Reuse

- `apps/web/lib/hooks/*` live→mock fallback pattern → as-is (returns `{ data, source }`).
- `components/ui/DataSourceBadge` → as-is.

## Surface

- `apps/web/lib/api/client.ts` — base URL → `/api/v1`.
- `apps/web/lib/hooks/*` — real endpoints, fallback retained.

## Verification

- Dashboard fetches from `/api/v1`; where a route exists the badge shows **live**, and where it
  doesn't the hook falls back to mock (badge shows **mock**) without crashing.
