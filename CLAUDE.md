# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is right now

GrowthOS (a unified SEO + Google Ads + Meta Ads growth platform) is **mid-rebuild**. An earlier, working
implementation was deliberately preserved and the project is being rebuilt onto the blueprint stack. Two
worlds coexist in this repo:

- **Root = the new build** — a Turborepo (pnpm) monorepo: `apps/*`, `packages/*`. This is where all new work goes.
- **`/legacy` = the old build, reference-only** — the previous app (Next.js frontend, 7 Python/Node
  microservices + gateway, SQL schema, infra, CI). **Do not modify, build, or run `/legacy`.** It exists to
  copy logic/screens forward and as an implementation spec.

Because of this split, before changing anything confirm whether a path is under `/legacy` (reference) or at
root (live). Reusing legacy logic means porting/copying it into the new structure, not editing it in place.

## The three sources of truth (read these before planning work)

0. **`docs/GrowthOS_SaaS_Blueprint.md`** — the original product/research blueprint & full application
   specification (market research, personas, product vision, the three-channel insight loop, complete feature
   spec, technical design). The **source narrative** the `docs/blueprint/*` docs below were distilled from —
   read it for the "why" and full feature intent behind a module; the engineering-facing specs below remain the
   day-to-day reference. Where it predates the locked decisions, `DECISIONS.md` still wins.
1. **`docs/blueprint/`** — the full spec: target architecture, data model, API surface, roadmap (ARCHITECTURE,
   DATA_MODELS, API_SPEC, ENGINEERING, PRD, ROADMAP, REPO_SETUP, GETTING_STARTED). **Read the relevant blueprint
   doc before implementing any feature** — DB tables are in `DATA_MODELS.md`, endpoints in `API_SPEC.md`, route/code
   patterns in `ENGINEERING.md`. Full path: `docs/blueprint/`.
2. **`docs/blueprint/DECISIONS.md`** — **authoritative. It overrides the blueprint wherever they conflict.**
   The six locked decisions (do not silently reintroduce what they rule out):
   - **D1** Auth = **Better Auth** (not Supabase), running in `apps/api`, tables in Neon via Drizzle,
     workspaces via its organization plugin. Every "Supabase"/`supabase_jwt`/`@supabase/*` in the blueprint
     means Better Auth instead.
   - **D2** Database = **Neon Postgres only** (app data + auth), via Drizzle in `packages/db`. No second DB provider.
   - **D3** **Maximize free tiers.** ClickHouse runs locally via Docker in dev (Cloud deferred); Upstash Kafka deferred.
   - **D4** **Claude/Anthropic API deferred.** Content briefs, recommendation text, and reports use
     deterministic/template logic. Claude is optional behind a flag (`ANTHROPIC_API_KEY`); it must fall back cleanly.
   - **D5** Frontend is **rebuilt fresh** on the blueprint stack (Next 15 / React 19 / Tailwind v4 /
     shadcn), in slices — *not* carried forward (this reverses the original D5). Tested `@growthos/logic`
     engines are ported unchanged; the backend auth in `apps/api` is kept. `/legacy` stays as reference.
   - **D6** **shadcn/ui is the component layer, used maximally.** New UI is shadcn-first; shared components go in `packages/ui`.
3. **`docs/plan/`** — the living **Milestone → Phase → Subphase** tracker with a `progress.md` at every level.
   Start at `docs/plan/PROGRESS.md` for current status. When you do work, tick the subphase checkboxes in the
   phase `plan.md`, update that phase's `progress.md`, and roll the status up into the milestone `progress.md`
   and the master `PROGRESS.md`. These docs are the source of truth for progress.

`docs/superpowers/specs/2026-07-05-restructure-design.md` explains the overall restructure approach.

## Current state of the new build (what exists vs. not)

- `apps/api` — Fastify v5. `GET /health`, **Better Auth mounted at `/api/auth/*`** (email/password +
  organization plugin → workspaces; `src/auth.ts` wires it to Neon via Drizzle), and the **`/api/v1` domain
  skeleton shipped (P1.3)** in `src/routes/v1.ts`: `GET /api/v1/auth/me`, `POST/GET /workspaces`,
  `GET /workspaces/:id/connections`, behind the `requireWorkspaceMember(role)` guard (`src/guards.ts`) + typed
  error envelope (`src/errors.ts`). `app.ts` = routes/plugins (inject-able); `index.ts` = the `listen`
  entrypoint. Dev runs via `node --watch-path=./src --env-file=.env --import tsx` (see the dev-server gotchas below). The `/api/v1` surface has since grown well past the
  skeleton (SEO, Google/Meta Ads, intelligence, attribution, recommendations, audit, collaboration, branding
  — see `src/routes/v1.ts`).
- `apps/web` — **rebuilt fresh** on Next 15 / React 19 / **Tailwind v4** / shadcn (the old carried-forward
  app was reset; `/legacy/apps/web` keeps the reference). **M1 complete (Slices 1 + 2):** design system (theme
  tokens in `styles/globals.css`), landing page (`app/(marketing)`), full auth + onboarding (`app/(auth)`)
  wired to Better Auth via `lib/auth/client.ts`, and the **dashboard shell + Growth Hub** (`app/(dashboard)`)
  with the **live→mock data layer rebuilt (P1.4b)** — `lib/api/client.ts` points at `/api/v1`, `lib/hooks`
  fall back through `liveOrMock` to `@growthos/logic` over `@growthos/logic/fixtures`, surfaced by `DataSourceBadge`. Remaining
  dashboard modules are later M2 slices.
- `packages/db` — Drizzle + Neon; Better Auth tables + tenancy (`workspaces`, `workspace_members`,
  `platform_connections`). Migrations in `packages/db/drizzle`.
- `packages/ui` — `@growthos/ui`, shared shadcn primitives (button, input, card, dialog, dropdown-menu,
  table, tabs, sonner, label), consumed via `transpilePackages`.
- `packages/types` — `@growthos/types`, shared request/response + domain types across `apps/api` and `apps/web`.
- `packages/config` — shared TypeScript base config only.
- `apps/worker` — **exists (M2 P2.1 done).** Plain **Python** worker (not Celery) driven by a Redis job-bridge
  (JSON envelope): `app/consumer.py`, `app/dispatch.py`, `app/envelope.py`, handlers in `app/handlers/`,
  and `app/strategy.py`. Pytest suite in `tests/`. Local Redis + ClickHouse via `docker-compose.yml`.
  `seeds/clickhouse_seed.py` is **retired and must not be run** — the API seeds `ad_performance`
  itself, over a different window, and the two overlap into silently doubled rows. Check
  `docs/plan/` for current phase status before assuming anything else.

The canonical business logic lives in **`packages/logic/src/*`** (the `@growthos/logic` package — pure, tested
TS engines in `engines/`: `seo-scoring`, `search-terms-bridge`, `creative-fatigue`, `cross-channel-engine`,
`blended-mer`, `goal-simulator`, `google-ads-advisor`, `meta-ads-advisor`, `attribution`; plus top-level
brief/recommendation/intelligence helpers). Consumed by both `apps/api` and `apps/web` via `workspace:*`. The
same logic is duplicated as ports inside `/legacy` services — treat the `@growthos/logic` copies as canonical.

**The seeded demo account is defined once, in `packages/logic/src/fixtures/seed.ts`.** The window
(`SEED_DAYS`, `SEED_LAST_DAY`), `REVENUE_FACTOR`, the per-day variance and the campaign roster all
live there, because `apps/api` inserts from it into ClickHouse and `apps/web` reads it for the
offline `liveOrMock` fallback — and `apps/web` cannot import from `apps/api`. Every past copy of that
arithmetic drifted and produced a visibly different product offline (a flat MER line at 8.59x
against a live 27.43x; a one-row campaign table against a four-row one). **Do not re-derive seeded
figures anywhere else** — import them. Its own suite pins the invariant that a change to the campaign
split cannot move a platform's daily totals, since MER, the Growth Hub, the weekly report and the
intelligence report all read those totals.

## Commands

Package manager is **pnpm** (workspaces + Turborepo). Node 22+.

```bash
pnpm install                       # install all workspaces (build scripts for esbuild/sharp are pre-approved in pnpm-workspace.yaml)

pnpm build                         # turbo build across all packages
pnpm dev                           # turbo dev (persistent; runs each package's dev)
pnpm typecheck                     # turbo typecheck
pnpm lint                          # turbo lint

pnpm --filter @growthos/api dev    # Fastify API only  (port from API_PORT, default 3001)
pnpm --filter @growthos/api build  # tsc build; output in dist/
pnpm --filter @growthos/web dev    # Next.js only       (port 3000)
pnpm --filter @growthos/web build  # next build (verifies all pages compile)
```

### Dev-server gotchas (each cost hours before it was pinned down)

- **The API dev script is `node --watch-path=./src …` — not `tsx watch`, and not bare `node --watch`.**
  Both alternatives fail, differently, and both look like the API "just hanging":
  - `tsx watch` spawns a grandchild to manage reloads, and that spawn never survives turbo's stdio
    setup: the task prints its command line and then hangs forever. Don't "restore" it. Anything
    else that wraps the API in an extra process will hit the same wall — keep the process tree flat.
  - Bare `node --watch` restart-loops and never binds. Measured standalone, with no turbo involved:
    6 restarts in 45s and 0 successful binds, the restarts landing *during* module loading — a probe
    that only imports `app.js` never reached its first `console.log`. A trivial one-line TS file
    under the same flags is perfectly stable, so it is the size of the graph, not tsx or watch mode
    as such. `--watch` registers every file it loads, tsx writes transpile cache into `%TEMP%`
    while loading, and the writes restart the process before it finishes booting.
    (`TSX_DISABLE_CACHE=1` cuts it from 6 restarts to 2 — so the cache is most of it, not all.)

  `--watch-path=./src` fixes it by watching only source: 0 restarts, binds first time, and editing a
  file under `src/` still reloads. **Caveat: `--watch-path` is macOS/Windows only** — on Linux it
  throws `ERR_FEATURE_UNAVAILABLE_ON_PLATFORM`, so use plain `--watch` there (the loop above has not
  been reproduced on Linux).
- **The API logs `Server listening at http://127.0.0.1:3001` on success.** If `pnpm dev` shows the
  `@growthos/api:dev: $ …` line and nothing after it, the API is *not* up — that silence is the symptom,
  not normal behaviour. Confirm with `curl localhost:3001/health`: JSON means the API owns the port,
  HTML means something else grabbed it (Next.js auto-increments to 3001 when 3000 is busy, and on Windows
  the second bind succeeds silently, so two processes can listen at once —
  `netstat -ano | grep ":3001"` showing two PIDs is the tell). Kill stale dev servers before restarting;
  overlapping `pnpm dev` runs are what turn this into a recurring mystery.
- **`pnpm dev` preflights the ports and refuses to start if either is taken**
  (`scripts/dev-preflight.mjs`), which is what stops the mystery above from recurring. It names the
  port, the PID and the process holding it. If you bypass it, note that turbo drops the API's
  `EADDRINUSE` line before the process dies — `index.ts` therefore also writes that error
  synchronously to fd 2, because pino's async write is truncated by `process.exit()`.
- **`pnpm build` and `pnpm dev` no longer share an output directory — keep it that way.**
  `apps/web/next.config.mjs` sets `distDir` to `.next-dev` in development and `.next` in production.
  They used to both write `.next`, so running a production build while the dev server was up corrupted
  the running server in ways that look like application bugs and are not: once the build overwrote the
  dev CSS (every page rendered with zero styles), and once the dev server recompiled onto production
  chunks and every request died with `__webpack_modules__[moduleId] is not a function`. If either
  symptom appears, stop the dev server, delete both output dirs, and restart — don't debug the app.

Tests use **vitest**. The engine unit suite lives in `@growthos/logic`; `apps/api` has route/integration
tests (they need local Redis + ClickHouse via Docker, and Neon via `apps/api/.env`); `apps/web` keeps a small
unit suite (e.g. `liveOrMock`):

```bash
pnpm --filter @growthos/logic test                                # all engine unit tests (pure, no infra)
pnpm --filter @growthos/logic exec vitest run src/engines/blended-mer.test.ts   # a single test file
pnpm --filter @growthos/logic exec vitest run -t "fatigue"        # tests matching a name
pnpm --filter @growthos/api test                                  # api route/integration tests (needs infra)
pnpm --filter @growthos/web test                                  # web unit tests
```

To exercise an `apps/api` route without opening a port, build then use Fastify's inject:
`node --input-type=module -e "import('./apps/api/dist/app.js').then(async m => { const a=m.buildApp(); console.log((await a.inject({method:'GET',url:'/health'})).body); await a.close() })"`

## Conventions specific to this repo

- **Package naming:** `@growthos/*` (lowercase). Cross-package deps use `workspace:*` and inherit the shared
  tsconfig via `extends: "@growthos/config/typescript/base.json"`.
- **`apps/api` is ESM + NodeNext strict TypeScript.** Relative imports **must include the `.js` extension**
  (e.g. `import { buildApp } from './app.js'`) even though the source is `.ts` — required by NodeNext/ESM and
  it will fail to build otherwise. Keep `app.ts` (routes/plugins, exercisable via `inject()`) separate from
  `index.ts` (the `listen` entrypoint).
- **`apps/web` is Tailwind v4 + shadcn** (rebuilt fresh — D5/D6). Theme tokens (color/radius/shadow/font)
  live in `apps/web/styles/globals.css` and are consumed as utilities — **never hardcode hex in
  components**. Fonts: Archivo (display, `font-display`) + Inter (body) + JetBrains Mono (data,
  `font-mono`), via `next/font`. Shared primitives come from `@growthos/ui`; app-specific compositions
  stay in `apps/web`.
- **The brand is "Signal"** — ember `--primary` (`#ce4218` light / `#ff6b41` dark) on cold graphite
  `--ink`, plus `--channel-seo` / `--channel-google` / `--channel-meta` for channel identity and
  `--elev-1..5` behind `--shadow-*`. Spec: `docs/superpowers/specs/2026-08-27-rebrand-landing-design.md`.
  Two things to know before touching colour:
  - **The identity is not `--primary`.** `BrandingProvider.tsx` overrides it (and `--ring`) per workspace
    for white-labelling, with an inline style that beats `:root` and `.dark`. Identity lives in the ink
    surfaces, the type, and the Exchange signature. Never rely on primary's hue for legibility, and add
    any token that must move *with* the brand colour to that `useEffect` or it will silently desync.
  - **`--warning` is gold and `--destructive` is rose on purpose.** Both were shifted off orange-red so
    they stay unmistakable next to an ember primary. Don't quietly revert them.
- **Marketing copy is held to what shipped.** No GEO / AI-citation tracking (P4.4b deferred), no AI
  image/video (P4.2b), no "prediction" (it's a retrospective *scorecard*), no live ad-platform writes
  (P4.3b), and no claim an LLM writes the copy (D4 — generation is deterministic). `PLAN_LIMITS` in
  `@growthos/types` is the billing contract: filter features out of the *marketing* view rather than
  editing it.
- **Channel slugs never reach the screen.** `google_ads` / `meta_ads` / `organic` are the storage and
  API form; anything a person reads renders through `channelLabel()` from `@growthos/logic`
  (`packages/logic/src/channels.ts`) — including generated prose, since the weekly report is also
  rendered into the customer PDF. Add new channels to `CHANNEL_LABELS` there, not to a local map in a page.
- **Workspace isolation** is by `workspace_id` at the application layer (Fastify), not Postgres RLS (see D1).
  Every data endpoint is nested under `/workspaces/:id/...` and guarded by workspace membership + role.

## Backend — API contract & job model (`apps/api`, `apps/worker`)

When building out `apps/api` (currently only `/health`), follow the blueprint contract so it matches what the
frontend and legacy services already assume:

- **JSON is camelCase** across the API boundary — the frontend TS types depend on it (the legacy Python services
  serialized camelCase for exactly this reason).
- Routes are versioned under **`/api/v1`**; data routes are nested under **`/workspaces/:id/...`** and guarded by
  workspace membership + role (`owner` / `admin` / `manager` / `viewer` / `client`).
- **Error envelope:** `{ error: { code, message, statusCode } }`. Fixed codes: `UNAUTHORIZED` (401),
  `FORBIDDEN` (403), `WORKSPACE_NOT_FOUND` (404), `PLAN_LIMIT_REACHED` (402), `INTEGRATION_NOT_CONNECTED`,
  `RATE_LIMITED` (429), `JOB_QUEUED` (202), `INTERNAL_ERROR` (500).
- **Async work:** long operations return `202 { jobId, statusUrl }`; the client polls
  `GET /workspaces/:id/jobs/:jobId` or listens for the `job:complete` WebSocket event. List endpoints paginate
  via `limit`/`offset` and return a `total`.
- **Fastify never calls AI or third-party marketing APIs directly.** It enqueues jobs over a **Redis job-bridge**
  (JSON envelope) that the **plain Python worker** (`apps/worker`, *not* Celery) consumes; the worker writes
  results to Neon and pushes updates over WebSocket. TypeScript owns request/response; Python owns data/AI/crawling
  work. (The blueprint's original BullMQ/Celery choice was simplified to this bridge in M2 P2.1.)
- Validate all inputs with **zod** (Fastify) / **Pydantic** (worker).
- Better Auth and Drizzle move fast — check their current docs via context7 when wiring them, don't rely on memory.

## Frontend architecture (`apps/web`)

- **State:** TanStack Query for server state, Zustand for client state — both wired in
  `apps/web/components/Providers.tsx`.
- **Data-fetching pattern (preserve it):** each feature hook in `lib/hooks/*` calls the live API and, on failure,
  runs the matching `@growthos/logic` engine over `@growthos/logic/fixtures` locally, returning `{ data, source: "live" | "mock" }`.
  `components/ui/DataSourceBadge` surfaces which was used. When re-pointing to `apps/api`, keep this graceful
  live→mock fallback — it's what lets the app render without a backend.
- **Routes** are grouped: `app/(auth)` (welcome, sign-in/up, onboarding steps) and `app/(dashboard)` (the
  product), each with a shared `layout.tsx`. Dashboard navigation is module-based via
  `components/layout/{Sidebar,TopBar,ModuleTabs}`.

## Frontend rules (`apps/web`)

- **shadcn/ui, used maximally (D6).** Every UI primitive — button, input, select, dialog, dropdown, tabs, table,
  card, toast, tooltip, sheet, etc. — uses its **shadcn** component. New UI is **shadcn-first**; a hand-rolled
  component is the exception and needs a reason. Do not add another component library. Shared shadcn components
  live in `packages/ui`; app-specific compositions of them stay in `apps/web`.
- **Global styles + theme tokens live in `apps/web/styles/globals.css`.** Define colors, spacing, and radii as
  CSS variables (shadcn tokens) there and consume them through the Tailwind theme. Do **not** scatter
  component-level `.css` files or hardcode hex colors in components.
- **Style with Tailwind utility classes + the `cn()` helper** (`apps/web/lib/utils/cn.ts` — clsx + tailwind-merge).
  Avoid inline `style={{…}}` except for genuinely dynamic values.
- **Theming (light/dark) comes from the shadcn CSS variables in `globals.css`** — never hardcode theme colors in
  components; reference the token (e.g. `bg-background`, `text-muted-foreground`).

## Git

Restructure work is on the **`shihab-restructure`** branch; `main` holds the pre-restructure state. Commits in
this project end with:

