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
   - **D5** Existing frontend is **carried forward, migrated incrementally** — not rebuilt.
   - **D6** **shadcn/ui is the component layer, used maximally.** New UI is shadcn-first; shared components go in `packages/ui`.
3. **`docs/plan/`** — the living **Milestone → Phase → Subphase** tracker with a `progress.md` at every level.
   Start at `docs/plan/PROGRESS.md` for current status. When you do work, tick the subphase checkboxes in the
   phase `plan.md`, update that phase's `progress.md`, and roll the status up into the milestone `progress.md`
   and the master `PROGRESS.md`. These docs are the source of truth for progress.

`docs/superpowers/specs/2026-07-05-restructure-design.md` explains the overall restructure approach.

## Current state of the new build (what exists vs. not)

- `apps/api` — Fastify v5 skeleton. **Only `GET /health` exists.** No DB, no auth, no domain routes yet.
- `apps/web` — the legacy Next.js 15 / React 19 frontend **carried forward verbatim** (80+ pages, builds).
  It still uses its **old API client** (`lib/api/client.ts`: localStorage JWT, points at the old `:8000`
  gateway) with a live→mock fallback in `lib/hooks/*`. It is **not yet re-pointed to `apps/api` or on Better Auth** (that is milestone M1, phase P1.4).
- `packages/config` — shared TypeScript base config only.
- **Not created yet:** `packages/db`, `packages/types`, `packages/ui`, `apps/worker` (Python/Celery). These
  are upcoming M1/M2 phases — check `docs/plan/` before assuming they exist.

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
- **`apps/web` is still Tailwind v3 + ad-hoc components.** Migrating it to shadcn/ui + Tailwind v4 (D6) is
  planned work — follow `docs/plan/` M1 P1.5, don't do it ad hoc.
- **Workspace isolation** is by `workspace_id` at the application layer (Fastify), not Postgres RLS (see D1).
  Every data endpoint is nested under `/workspaces/:id/...` and guarded by workspace membership + role.

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
