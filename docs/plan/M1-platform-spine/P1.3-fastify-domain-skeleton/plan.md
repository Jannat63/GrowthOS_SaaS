# P1.3 — Fastify domain skeleton

Milestone: M1 · Depends on: P1.1, P1.2 · Prerequisites: Neon URL (for full verify)

## Goal

Establish the Fastify domain conventions — core plugins, a workspace-member guard, the first
`/api/v1` routes with zod validation and a typed error envelope, and the start of `packages/types`.

## Subphases

- [ ] Add core plugins: db, auth/session-verify, cors, and a typed error envelope
  `{error:{code,message,statusCode}}`.
- [ ] Add the `requireWorkspaceMember(role)` app-layer guard.
- [ ] Add routes: `GET /api/v1/auth/me`, `POST/GET /api/v1/workspaces`,
  `GET /api/v1/workspaces/:id/connections`.
- [ ] Add zod validation + an error-code table.
- [ ] Start `packages/types` (auth / workspace / recommendation / `WebSocketEvent` union).

## Reuse

- `docs/blueprint/ENGINEERING.md` → route pattern (reference).
- `docs/blueprint/API_SPEC.md` → surface (reference).

## Surface

- `apps/api` plugins: db, auth/session-verify, cors, error envelope.
- Guard: `requireWorkspaceMember(role)`.
- Endpoints: `GET /api/v1/auth/me`, `POST /api/v1/workspaces`, `GET /api/v1/workspaces`,
  `GET /api/v1/workspaces/:id/connections`.
- `packages/types` — auth, workspace, recommendation, `WebSocketEvent` union.

## Verification

- An authed `GET /api/v1/auth/me` returns the profile + memberships.
- A non-member request → 403.
