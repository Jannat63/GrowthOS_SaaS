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
     shadcn), in slices — *not* carried forward (this reverses the original D5). Tested `lib/logic`
     engines are ported unchanged; the backend auth in `apps/api` is kept. `/legacy` stays as reference.
   - **D6** **shadcn/ui is the component layer, used maximally.** New UI is shadcn-first; shared components go in `packages/ui`.
3. **`docs/plan/`** — the living **Milestone → Phase → Subphase** tracker with a `progress.md` at every level.
   Start at `docs/plan/PROGRESS.md` for current status. When you do work, tick the subphase checkboxes in the
   phase `plan.md`, update that phase's `progress.md`, and roll the status up into the milestone `progress.md`
   and the master `PROGRESS.md`. These docs are the source of truth for progress.

`docs/superpowers/specs/2026-07-05-restructure-design.md` explains the overall restructure approach.

## Current state of the new build (what exists vs. not)

- `apps/api` — Fastify v5. `GET /health` plus **Better Auth mounted at `/api/auth/*`** (email/password +
  organization plugin → workspaces). `apps/api/src/auth.ts` wires it to Neon via Drizzle. **No `/api/v1`
  domain routes yet** (that's P1.3).
- `apps/web` — **rebuilt fresh** on Next 15 / React 19 / **Tailwind v4** / shadcn (the old carried-forward
  app was reset; `/legacy/apps/web` keeps the reference). **Slice 1 shipped:** design system (theme tokens
  in `styles/globals.css`), landing page (`app/(marketing)`), and the full auth + onboarding flow
  (`app/(auth)`) wired to Better Auth via `lib/auth/client.ts`. Dashboard modules are later slices. The
  live→mock data hooks (`lib/hooks`) are **not rebuilt yet** — they return in the dashboard slices (P1.4b).
- `packages/db` — Drizzle + Neon; Better Auth tables + tenancy (`workspaces`, `workspace_members`,
  `platform_connections`). Migrations in `packages/db/drizzle`.
- `packages/ui` — `@growthos/ui`, shared shadcn primitives (button, input, card, dialog, dropdown-menu,
  table, tabs, sonner, label), consumed via `transpilePackages`.
- `packages/config` — shared TypeScript base config only.
- **Not created yet:** `packages/types`, `apps/worker` (Python/Celery). Check `docs/plan/` before assuming.

The canonical business logic lives in **`apps/web/lib/logic/*`** (6 pure, tested TS engines: `seo-scoring`,
`search-terms-bridge`, `creative-fatigue`, `cross-channel-engine`, `blended-mer`, `goal-simulator`). The same
logic is duplicated as ports inside `/legacy` services — treat the `apps/web/lib/logic` copies as canonical.

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

Tests (web uses **vitest**):

```bash
pnpm --filter @growthos/web test                                  # all web unit tests
pnpm --filter @growthos/web exec vitest run lib/logic/blended-mer.test.ts   # a single test file
pnpm --filter @growthos/web exec vitest run -t "fatigue"          # tests matching a name
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
- **`apps/web` is Tailwind v4 + shadcn** (rebuilt fresh — D5/D6). Theme tokens (color/radius/shadow/font,
  incl. the indigo `--primary` / green `--success` / deep-indigo `--ink` brand set) live in
  `apps/web/styles/globals.css` and are consumed as utilities — **never hardcode hex in components**.
  Fonts: Space Grotesk (display, `font-display`) + Inter (body), via `next/font`. Shared primitives come
  from `@growthos/ui`; app-specific compositions stay in `apps/web`.
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
- **Fastify never calls AI or third-party marketing APIs directly.** It enqueues jobs (BullMQ/Redis) that the
  Python **Celery worker** (`apps/worker`) consumes; the worker writes results to Neon and pushes updates over
  WebSocket. TypeScript owns request/response; Python owns data/AI/crawling work.
- Validate all inputs with **zod** (Fastify) / **Pydantic** (worker).
- Better Auth and Drizzle move fast — check their current docs via context7 when wiring them, don't rely on memory.

## Frontend architecture (`apps/web`)

- **State:** TanStack Query for server state, Zustand for client state — both wired in
  `apps/web/components/Providers.tsx`.
- **Data-fetching pattern (preserve it):** each feature hook in `lib/hooks/*` calls the live API and, on failure,
  runs the matching `lib/logic` engine over `lib/mock-data` locally, returning `{ data, source: "live" | "mock" }`.
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

```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
