# P1.4 — Web re-point to api

Milestone: M1 · Depends on: P1.2 · Prerequisites: P1.2 (Better Auth live)

## Goal

Point the carried-forward `apps/web` at the new Fastify `/api/v1` and the Better Auth client,
replacing the legacy localStorage-JWT flow so real login drives the frontend.

## Subphases

- [ ] Swap `apps/web/lib/api/client.ts` base URL to the Fastify `/api/v1`.
- [ ] Replace the localStorage-JWT auth with the Better Auth client.
- [ ] Update the sign-in / sign-up pages to use Better Auth.
- [ ] Back `middleware.ts` with the Better Auth session.
- [ ] Keep the hooks' live→mock fallback intact.

## Reuse

- `legacy` `lib/hooks` + `lib/api` pattern → as-is.
- `DataSourceBadge` → as-is.

## Surface

- `apps/web/lib/api/client.ts` — base URL → `/api/v1`.
- `apps/web` sign-in / sign-up pages — Better Auth client.
- `apps/web/middleware.ts` — Better Auth session-backed.
- Hooks — retain live→mock fallback + `DataSourceBadge`.

## Verification

- Browser sign-up → user appears in Neon → the protected dashboard loads.
