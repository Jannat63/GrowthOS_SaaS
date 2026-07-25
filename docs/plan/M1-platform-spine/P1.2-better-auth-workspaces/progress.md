# P1.2 — Progress

Status: [x]  ·  Updated: 2026-07-05

| Item | Status | Notes |
|------|--------|-------|
| better-auth in `apps/api` (Drizzle/Neon adapter, email/password) | [x] | `apps/api/src/auth.ts`: drizzleAdapter(db, provider pg), emailAndPassword. |
| Organization plugin ⇒ workspaces/members/roles | [x] | modelName maps org→`workspaces`, member→`workspace_members`, invitation→`workspace_invitations`; domain `additionalFields` on workspaces. Schema in `packages/db/src/schema/auth.ts`. |
| Mount handler in Fastify (`/api/auth/*`) | [x] | `apps/api/src/app.ts` — fromNodeHeaders → Web Request → `auth.handler`. |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | [x] | In `apps/api/.env` (gitignored) + documented in `.env.example`. |
| Apply migration + live verify | [x] | 8 tables migrated to Neon; `scripts/verify-auth.ts` passed. |

## Verification (passed)

Ran `apps/api/scripts/verify-auth.ts` (Fastify `inject`, no port):
- `POST /api/auth/sign-up/email` → **200**; `user` + `session` rows in Neon.
- `POST /api/auth/organization/create` → **200**; `workspaces` row (plan `starter` — the
  `additionalFields` default applied) + `workspace_members` row with role **`owner`**.
- Note: Better Auth enforces a CSRF `Origin` check on state-changing routes — requests must send an
  `Origin` that matches `trustedOrigins` (`WEB_ORIGIN`). The web client sends this natively.

## Decisions / notes

- Better Auth **owns** identity + tenancy tables (D1); generated via the Better Auth CLI into
  `packages/db/src/schema/auth.ts`. The provisional P1.1 `workspaces`/`workspace_members` are being
  replaced by the Better Auth-shaped versions (member needs its own `id` PK; org carries createdAt/
  metadata + our domain `additionalFields`).
- `platform_connections.workspace_id` FK to `workspaces` was **dropped** at the DB level — a Drizzle
  cross-file `.references()` needs a `./auth.js` import that drizzle-kit's loader can't resolve.
  Isolation is app-layer (CLAUDE.md), so this is acceptable; can be reintroduced when schema files
  are consolidated.
- Pinned `better-auth` + `@better-auth/cli` to `1.4.21` (exact) — a `^` range pulled two versions
  (1.6.23 + 1.4.21) whose `better-call` skewed and broke the CLI loader.

## Log

- 2026-07-05 — Plan created.
- 2026-07-05 — Neon URL provided → unblocked. Wired Better Auth (auth.ts), org plugin mapped to
  workspaces naming, generated auth schema into packages/db, mounted `/api/auth/*`, added env.
- 2026-07-05 — DB reset + unified `0000_init` migration applied (8 tables). Live verify passed:
  sign-up → user+session; create-workspace → workspaces (plan starter) + owner membership. Full
  build green. **P1.2 done.**
