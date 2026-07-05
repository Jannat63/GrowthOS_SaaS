# P1.1 — Progress

Status: [x]  ·  Updated: 2026-07-05

| Item | Status | Notes |
|------|--------|-------|
| Create `packages/db` (drizzle-orm, @neondatabase/serverless, drizzle-kit) | [x] | `@growthos/db`, ESM/NodeNext, builds to `dist`. |
| `drizzle.config.ts` | [x] | `dialect: postgresql`; `schema` points at table files (not the `.js` barrel — drizzle-kit loader limitation). |
| Neon client | [x] | `src/client.ts` — `neon-http` driver, throws if `DATABASE_URL` unset. |
| Tenancy schema (workspaces, workspace_members, platform_connections) | [x] | Better-Auth-compatible (text ids, string role); user FKs deferred to P1.2. |
| Generate + push migration | [x] | `drizzle-kit generate` → `drizzle/0000_init_tenancy.sql`; applied via `db:migrate` (non-interactive; `push` is interactive). |
| Optional demo seed | [ ] | Skipped for now; smoke script covers write/read. |

## Verification

- `drizzle-kit generate` → migration written; `db:migrate` applied it to Neon. ✅
- `db:smoke` inserted a workspace, read it back, cleaned up — live Neon read/write OK. ✅
- `pnpm build` green (api + web + db, 3/3). ✅

## Reconciliation note (for P1.2)

`workspaces` / `workspace_members` are modeled to be adopted by Better Auth's organization plugin
(text ids, string `role`). In P1.2: point the org plugin at these table names, add the Better Auth
auth tables (`user`/`session`/`account`/`verification`), and add the deferred user FKs
(`workspaces.owner_id`, `workspace_members.user_id` / `invited_by` → `user.id`). Add each new schema
file to the `schema` array in `drizzle.config.ts`.

## Log

- 2026-07-05 — Plan created.
- 2026-07-05 — Neon URL provided. Built `packages/db` (Drizzle + neon-http), tenancy schema, config,
  client. Generated + applied `0000_init_tenancy`. Live write/read verified. Full build green. Done.
