# GrowthOS — Restructure Design

**Date:** 2026-07-05
**Status:** Approved (direction), ready for implementation planning
**Author:** Sheikh Shihab Hossain + Claude

---

## 1. Context

There are two things today:

1. **The current app** (`GrowthOS_SaaS`) — a working Next.js frontend (84 pages) plus 7 Python
   microservices, a Node API gateway, custom bcrypt/JWT auth, and local Postgres. Built one way.
2. **The blueprint** (8 docs in `C:\Users\Shihab\Documents\GrowthOS`: ARCHITECTURE, PRD, ENGINEERING,
   ROADMAP, REPO_SETUP, GETTING_STARTED, API_SPEC, DATA_MODELS) — describes a different architecture.

**Finding:** the two are different enough that "reorganizing" the current code into the blueprint is
effectively a **rebuild on a new foundation**, not a refactor. The plan is therefore: build the new
version fresh, keep the old code as reference ("legacy"), and copy the good parts forward
(frontend screens, UI, domain logic) as we go.

### Gap between current and target

| Area | Current | Blueprint target | Our decision |
|---|---|---|---|
| Monorepo tool | npm workspaces | Turborepo + pnpm | Turborepo + pnpm |
| Backend shape | 7 Python services + Node gateway | 3 apps: `web`, `api`, `worker` | 3 apps |
| API layer | Python services | Fastify v5 + TypeScript | Fastify |
| Python role | all business logic + HTTP | background workers only (Celery) | workers only |
| Auth | custom bcrypt + JWT | Supabase Auth | **Better Auth** (see below) |
| Database | local Postgres + unused ClickHouse | Neon + ClickHouse Cloud + Upstash | **Neon** (all data), rest later |
| ORM | raw SQL | Drizzle | Drizzle |
| AI | none (free logic) | Claude API | **skip Claude for now** |
| UI kit | ad-hoc, Tailwind v3 | shadcn/ui, Tailwind v4 | shadcn/ui, adopt incrementally |
| Real-time | none | Socket.io / WS | later slice |

---

## 2. Decisions (locked)

1. **Follow the blueprint architecture, on free tiers.** Neon (Postgres, free), Upstash (Redis, free),
   Cloudflare R2 (free) as needed. ClickHouse runs locally via Docker during dev; ClickHouse Cloud deferred.
2. **Skip Claude for now.** Use the existing deterministic/template logic for content briefs,
   recommendation explanations, and reports. Claude becomes an optional later upgrade behind a flag.
3. **Auth = Better Auth; database = Neon only.** No Supabase. Better Auth stores its tables
   (user, session, account, verification) directly in Neon via Drizzle. Its **organization plugin**
   provides the `workspaces` / `workspace_members` / roles model. The old bcrypt/JWT auth becomes
   legacy reference. (Better Auth API detail to be confirmed against current docs via context7 at build time.)
4. **Same repo, restructured.** Move all current code into `/legacy` (untouched, reference-only) and
   build the new Turborepo at the repo root. The 8 blueprint docs are copied into `/docs`.
5. **Carry the frontend forward, migrate incrementally.** The current `apps/web` becomes the starting
   point for the new `apps/web`; re-point it to the new Fastify API and adopt shadcn/ui / Tailwind v4
   over time rather than rebuilding.
6. **shadcn/ui is the component layer, used maximally.** Every UI primitive uses its shadcn equivalent;
   ad-hoc components from `/legacy` are replaced with shadcn during migration; shared ones live in
   `packages/ui`. New UI is built shadcn-first. (See DECISIONS.md D6.)

---

## 3. Migration strategy

**Chosen: walking-skeleton migration.** Stand up the new Turborepo with a thin vertical slice that works
end-to-end (web → Fastify → Neon → auth), then thicken it feature by feature, pulling each piece forward
from `/legacy`. The app works at every step.

Rejected alternatives:
- *Big-bang rewrite* — nothing works until everything works; too risky.
- *Strangler per-service* — the 7-service and 3-app topologies are too different to run side by side.

---

## 4. Target monorepo structure

```
GrowthOS_SaaS/                    # same repo, restructured
├── legacy/                       # ALL current code, untouched, reference-only
│   ├── apps/web/                 #   source to copy the frontend forward from
│   ├── services/                 #   7 Python services = spec for the worker's logic
│   └── db/                       #   old SQL = reference for the Drizzle schema
│
├── apps/
│   ├── web/                      # Next.js 15 — carried forward, re-pointed to new api
│   ├── api/                      # Fastify v5 + TS + Better Auth + Drizzle   (NEW)
│   └── worker/                   # Python 3.12 Celery, deterministic logic   (later slice)
│
├── packages/
│   ├── db/                       # Drizzle schema + migrations + Neon client
│   ├── types/                    # shared TS types (web ↔ api)
│   ├── ui/                       # shadcn/ui shared components (grows over time)
│   └── config/                   # tsconfig / eslint / tailwind / prettier presets
│
├── docs/                         # the 8 blueprint docs + this spec
├── infra/                        # docker-compose.dev.yml (redis + clickhouse for local dev)
├── turbo.json · pnpm-workspace.yaml · package.json
```

Neon is hosted, so there is no local Postgres container — dev needs only a Neon connection string.
Redis and ClickHouse come online in later slices. `apps/worker` is scaffolded but stays thin until Slice 2.

---

## 5. Slice 1 — the first build (walking skeleton)

Goal: prove the whole new stack works end-to-end and get the existing frontend logging into a real backend.

1. **Scaffold** — Turborepo + pnpm at root; `packages/config` (base tsconfig, eslint, tailwind, prettier).
2. **`packages/db`** — Drizzle wired to Neon. First tables only: Better Auth tables + `workspaces` +
   `workspace_members` (via the organization plugin). Push migration to Neon.
3. **`apps/api` (Fastify)** — plugin skeleton (db, auth, cors, typed error handler per ENGINEERING.md);
   Better Auth mounted (email/password first); routes: `/health`, Better Auth handler,
   `GET/POST /api/v1/workspaces`; a `requireWorkspaceMember` guard.
4. **`apps/web` (carried forward)** — move `legacy/apps/web` → `apps/web`; swap the localStorage-JWT
   client for the Better Auth client; re-point the API base to Fastify; keep `middleware.ts` route
   protection, backed by a Better Auth session.
5. **Verify end-to-end** — `pnpm dev` runs web + api; sign up a real account → row lands in Neon →
   log in → protected dashboard renders (on existing client-side mock data + logic modules).

**Explicitly NOT in Slice 1:** Python worker, Celery/Redis, ClickHouse, ad-platform APIs, billing, Claude.

---

## 6. Sequencing after Slice 1

- **Slice 2** — scaffold `apps/worker` (Celery + Redis broker); move one deterministic module
  (e.g. cross-channel engine) server-side as a job; prove the Fastify → BullMQ → Celery → Neon path.
- **Slice 3** — port one full MVP feature vertically (Blended MER or Paid-to-Organic bridge) through
  web → api → db.
- **Slice 4+** — remaining MVP features → ClickHouse analytics → real integrations
  (Google / Meta / DataForSEO) → billing → Claude (optional upgrade).

Mirrors the blueprint's Month 1→3 arc, compressed onto free tiers.

---

## 7. Prerequisites before building

- **Node.js 22+** and **pnpm 9+** installed.
- A **Neon** account + a project, giving a `DATABASE_URL` connection string (needed at Slice 1, step 2).
- (Later slices only) Upstash Redis account; Docker for local ClickHouse.

---

## 8. Risks / open items

- Better Auth is newer than some deps; confirm current API (organization plugin, Fastify mount, Next
  client) against live docs during implementation.
- The current frontend calls Python-gateway paths (`/api/...`); re-pointing to Fastify `/api/v1/...`
  is incremental work spread across slices, starting with auth in Slice 1.
- `API_SPEC.md` and `DATA_MODELS.md` are the authoritative detail for endpoints and schema; consult
  them when defining Drizzle tables and Fastify routes.
