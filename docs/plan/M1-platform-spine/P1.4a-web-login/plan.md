# P1.4a — Web login (auth in the browser)

Milestone: M1 · Depends on: P1.2 · Prerequisites: P1.2 (Better Auth live) · Runs before P1.3

## Goal

Get the carried-forward `apps/web` logging into the real Better Auth backend: replace the legacy
localStorage-JWT flow with the Better Auth client so sign-up / sign-in create real user + session
rows in Neon and gate the protected routes.

## Subphases

- [ ] Add the Better Auth React client pointed at Fastify (`http://localhost:3001`).
- [ ] Wire the sign-in / sign-up pages to Better Auth (email/password).
- [ ] Back `apps/web/middleware.ts` route protection with the Better Auth session.
- [ ] Retire the legacy localStorage-JWT auth path (keep it only as reference).

## Reuse

- Existing `app/(auth)` sign-in / sign-up pages → rewire (as-is shell, new client).
- `apps/web/middleware.ts` → keep the route-protection structure, swap the token source.

## Surface

- `apps/web/lib/auth/*` — Better Auth client + session helpers (new).
- `apps/web` sign-in / sign-up pages — call Better Auth.
- `apps/web/middleware.ts` — Better Auth session-backed.

## Notes

- Better Auth enforces a CSRF `Origin` check on state-changing routes; the browser sends `Origin`
  natively, so real page requests pass (this is what tripped the `inject()` verify in P1.2).

## Verification

- Browser sign-up → a `user` row appears in Neon → a protected route renders behind a real session;
  signing out clears it.
