# GrowthOS

A unified SEO + Google Ads + Meta Ads growth platform. One workspace, three channels, and an
engine that reads across them — what organic search proves, paid should buy; what paid proves
converts, organic should own.

> **Status:** mid-rebuild, and not launched. See [Where the project is](#where-the-project-is).

## Two worlds in one repo

Read this before changing anything, because the same feature often exists twice.

| Path | What it is |
|------|------------|
| **root** (`apps/*`, `packages/*`) | **The live build.** All new work goes here. |
| **`/legacy`** | **The previous implementation — reference only.** Do not modify, build, or run it. |

The earlier app (Next.js frontend, seven Python/Node microservices, SQL schema, infra, CI) was
deliberately preserved when the project was rebuilt onto the blueprint stack. It stays as a working
spec: copy logic forward *into* the new structure, never edit it in place.

## Where to look things up

Four sources, in order of authority:

1. **[`docs/blueprint/DECISIONS.md`](docs/blueprint/DECISIONS.md)** — **authoritative.** Six locked
   decisions that override the blueprint wherever they conflict (Better Auth over Supabase, Neon as
   the only database, free-tier-first infra, Claude deferred, frontend rebuilt fresh, shadcn/ui as
   the component layer). Check here first; the blueprint predates some of it.
2. **[`docs/blueprint/`](docs/blueprint/)** — the engineering spec. Tables in `DATA_MODELS.md`,
   endpoints in `API_SPEC.md`, route and code patterns in `ENGINEERING.md`, plus `ARCHITECTURE`,
   `PRD`, `ROADMAP`, `REPO_SETUP`, `GETTING_STARTED`.
3. **[`docs/plan/PROGRESS.md`](docs/plan/PROGRESS.md)** — the living Milestone → Phase → Subphase
   tracker, and the source of truth for what is actually built. Every phase has its own `plan.md`
   and `progress.md`.
4. **[`docs/GrowthOS_SaaS_Blueprint.md`](docs/GrowthOS_SaaS_Blueprint.md)** — the original product
   research and full application specification the engineering docs were distilled from. Read it for
   the *why* behind a module.

Known-open bugs and gaps live in [`docs/AUDIT-2026-08-13-codebase.md`](docs/AUDIT-2026-08-13-codebase.md).

## Layout

```
apps/
  api/       Fastify 5 — REST at /api/v1, Better Auth at /api/auth/*, WebSocket, public API
  web/       Next 15 · React 19 · Tailwind v4 · shadcn/ui
  worker/    Python — consumes a Redis job-bridge; owns crawling, syncs, and data work
packages/
  logic/     @growthos/logic — the canonical business engines, pure and unit-tested
  db/        @growthos/db — Drizzle schema + Neon client + migrations
  types/     @growthos/types — request/response and domain types shared across api and web
  ui/        @growthos/ui — shared shadcn primitives
  config/    shared TypeScript base config
```

**`packages/logic` is where the product actually lives** — SEO scoring, the paid↔organic bridges,
creative fatigue, blended MER, the cross-channel rule registry, the ads advisors, attribution, and
the automation planner. Pure functions, no I/O, consumed by both the API and the web app. The same
logic exists as ports inside `/legacy`; these copies are canonical.

## Quickstart

Requires **Node 22+**, **pnpm**, **Python 3.12** (worker only), and **Docker** (Redis + ClickHouse).

```bash
pnpm install
docker compose up -d                 # Redis :6379, ClickHouse :8123

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# apps/api/.env needs at minimum: DATABASE_URL (Neon), BETTER_AUTH_SECRET, BETTER_AUTH_URL.
# The API fails fast at boot listing every missing variable at once.

pnpm --filter @growthos/db db:migrate
pnpm dev                             # web :3000, api :3001
```

The web app renders without a backend: every feature hook falls back to running the real
`@growthos/logic` engine over fixtures locally, and a `DataSourceBadge` shows which was used.

## Commands

```bash
pnpm dev            # turbo dev, all packages
pnpm build          # turbo build
pnpm typecheck      # turbo typecheck
pnpm lint

pnpm --filter @growthos/api dev      # API only  (:3001)
pnpm --filter @growthos/web dev      # web only  (:3000)
```

### Tests

```bash
pnpm --filter @growthos/logic test   # engine unit tests — pure, no infrastructure
pnpm --filter @growthos/db test      # the Neon retry policy
pnpm --filter @growthos/web test     # web unit tests
pnpm --filter @growthos/api test     # route + integration tests (needs Docker and a Neon URL)
```

The API suite runs against a real remote database, so it is slower and more sensitive to network
conditions than the others. `apps/api/vitest.config.ts` documents the timeouts and concurrency caps
and why they are set where they are.

## Conventions worth knowing before your first change

- **`apps/api` is ESM + NodeNext.** Relative imports must carry the `.js` extension
  (`import { buildApp } from './app.js'`) even though the source is TypeScript. It will not build
  otherwise. Keep `app.ts` (routes, exercisable via `inject()`) separate from `index.ts` (the
  `listen` entrypoint).
- **JSON is camelCase** across the API boundary.
- **Routes are versioned** under `/api/v1`, data routes nested under `/workspaces/:id/...` and
  guarded by workspace membership and role. Isolation is enforced in Fastify, not Postgres RLS.
- **Errors use one envelope:** `{ error: { code, message, statusCode } }`.
- **Long operations return `202 { jobId, statusUrl }`** — the client polls the job or listens for
  `job:complete` over WebSocket.
- **Fastify never calls AI or third-party marketing APIs directly.** It enqueues onto the Redis
  job-bridge; the Python worker does that work and pushes results back. TypeScript owns
  request/response, Python owns data.
- **Never hardcode a colour.** Theme tokens live in `apps/web/styles/globals.css` and are consumed
  as Tailwind utilities. UI is shadcn-first.
- Validate every input — zod in the API, Pydantic in the worker.

## Where the project is

**M4 — Automation & Scale**, phase **P4.3 (Automated Campaign Management)**.

Built and working: the platform spine (auth, workspaces, tenancy), the full insight loop across all
three channels, the intelligence engine and its scheduled autonomous loop, agency features
(collaboration, audit log, white-label, PDF export), billing and plan metering, the public API, and
P4.3a's automation control plane — rules, a planner, an approval queue, and an execution ledger.

Not built: live Google Ads and Meta *write* adapters, AI creative automation, GEO tracking, and the
mobile app. Most of those are blocked on external credentials — a Google Ads developer token, Meta
App Review — rather than on engineering.

The important caveat: **most channel data is currently seeded, not live.** Google Search Console is
the only real provider wired end to end. Everything else computes over fixtures or seeded ClickHouse
rows, which is why the app looks complete while the numbers are not yet yours.

## Contributing

Work happens on `shihab-restructure`; `main` holds the pre-restructure state. When you finish a
subphase, tick its boxes in the phase `plan.md` and roll the status up through that phase's
`progress.md`, the milestone `progress.md`, and `docs/plan/PROGRESS.md`. Those documents are the
project's memory — code that ships without them gets rediscovered and rebuilt.
