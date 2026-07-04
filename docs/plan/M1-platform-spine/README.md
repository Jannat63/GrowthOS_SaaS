# M1 — Platform Spine

Status: ⬜ Not started  *(next; most phases need the Neon URL)*

## Goal

A real database, real auth, shared packages, and the frontend wired to the new API — the load-
bearing spine every MVP feature will hang off of.

## Phases

| Phase | Summary | Status |
|-------|---------|--------|
| [P1.1 packages/db (Drizzle + Neon)](./P1.1-packages-db/plan.md) | `packages/db` with Drizzle + Neon client, tenancy schema, migrations, optional seed. | [!] |
| [P1.2 Better Auth + workspaces](./P1.2-better-auth-workspaces/plan.md) | Better Auth in `apps/api` (Drizzle/Neon adapter, email/password) + organization plugin ⇒ workspaces/members/roles. | [!] |
| [P1.3 Fastify domain skeleton](./P1.3-fastify-domain-skeleton/plan.md) | Core plugins, workspace-member guard, first `/api/v1` routes, zod validation, `packages/types`. | [!] |
| [P1.4 Web re-point to api](./P1.4-web-repoint-api/plan.md) | Point `apps/web` at the Fastify `/api/v1` + Better Auth client; session-backed middleware. | [ ] |
| [P1.5 shadcn/ui foundation](./P1.5-shadcn-ui-foundation/plan.md) | Init shadcn in `apps/web`, create `packages/ui`, add core primitives (shadcn-first). | [ ] |

## Status notes

- P1.1 / P1.2 are **blocked on the Neon connection string**.
- P1.3 is **blocked on the Neon URL for full verify**.
- P1.4 depends on P1.2.
- P1.5 needs **no Neon** — it is parallelizable and can start anytime (recommended first move).

## Exit criteria

- Real login works end-to-end against Neon.
- `/auth/me` + workspace guard live.
- shadcn adopted for core primitives.
