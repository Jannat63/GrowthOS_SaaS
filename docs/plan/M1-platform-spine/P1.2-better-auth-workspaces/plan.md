# P1.2 — Better Auth + workspaces

Milestone: M1 · Depends on: P1.1 · Prerequisites: Neon connection string (URL)

## Goal

Stand up Better Auth in `apps/api` on the Drizzle/Neon adapter with email/password, and use its
organization plugin to model workspaces, members, and roles.

## Subphases

- [ ] Add better-auth to `apps/api` with the Drizzle/Neon adapter and email/password enabled.
- [ ] Enable the organization plugin ⇒ workspaces / members / roles.
- [ ] Mount the Better Auth handler in Fastify at `/api/auth/*`.
- [ ] Configure `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.

## Reuse

- `legacy/services/auth-service` (security, google_oauth, email) → spec/reference.

## Surface

- `apps/api` — Better Auth wiring; handler mounted at `/api/auth/*`.
- Env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- Better Auth tables in Neon (user, session, organization/member — reconciled with P1.1 tenancy).

## Verification

- Sign-up writes a user + session row in Neon.
- Creating an organization produces a workspace + membership.
