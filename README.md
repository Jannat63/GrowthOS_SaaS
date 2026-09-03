# GrowthOS

A unified SEO + Google Ads + Meta Ads growth platform. One workspace, three channels, and an
engine that reads across them — what organic search proves, paid should buy; what paid proves
converts, organic should own.

> **Status:** mid-rebuild, and not launched. See [Where the project is](#where-the-project-is).

## Quick Start

See it running in one command, no accounts of any kind — no Neon, no Google, no Stripe, no Resend.

**Requirements:** [Docker](https://docs.docker.com/get-docker/), and Node 22+ with
[pnpm](https://pnpm.io):

```bash
corepack enable && corepack prepare pnpm@11.0.9 --activate   # if you don't already have pnpm
```

On Ubuntu / Zorin / Debian, Docker is one line if you don't have it:

```bash
sudo apt update && sudo apt install -y docker.io && sudo usermod -aG docker $USER
# then log out and back in — group membership needs a fresh session
```

Then, from the project root:

```bash
pnpm local
```

That's it. It checks Docker, generates every local secret and `.env` file, starts
Postgres/Redis/ClickHouse in Docker, sets up the database, seeds a fully populated demo workspace,
and starts the app:

```text
GrowthOS is ready!

Web:
  http://localhost:3000

API:
  http://localhost:3001

Demo login (local development only):
  Email:    demo@growthos.local
  Password: DemoPass123!
```

Open http://localhost:3000, sign in, and keep going in [Local Demo Mode](#local-demo-mode) below —
or jump to [Production / Developer Setup](#production--developer-setup) if you're working against
a real Neon database instead.

## Local Demo Mode

`pnpm local` is meant for exactly this: trying GrowthOS, demoing it, or developing against it
without setting up any external service first.

**What you get.** Every dashboard is already populated the moment you sign in: SEO keyword
rankings, organic traffic, Google Ads and Meta Ads performance, campaigns, cross-channel
recommendations (paid → organic and organic → paid), creative fatigue alerts, and the weekly
cross-channel intelligence report. This isn't bespoke demo-mode fixture data — `apps/api/scripts/seed-demo.ts`
calls the same "seed if empty" functions the real dashboard routes already call on a brand-new
workspace's first page load (`ensureAdPerformanceSeed`, `ensureKeywordRankingsSeed`,
`ensureFatigueAlerts`, and so on); the seed script just calls them once up front so nothing shows
an empty state while you're clicking around.

**What's deliberately left empty.** Automation rules. `automation/rules.ts`'s own doc comment
explains why: *"automation is something you turn on deliberately, not something you discover is
already running"* — a subsystem that can pause campaigns and move budget shouldn't have a default
that's already live, not even in a demo. Turn one on yourself under Settings → Automation to see it
work. There's also no seeded data for in-app notifications — that feature doesn't exist yet.

**Re-running is safe.** Every step — env files, Docker containers, schema, demo user, demo
workspace, seeded data — checks what's already true before doing anything. Run `pnpm local` as
many times as you like; it won't duplicate data, regenerate secrets you're already using, or
overwrite an `.env` file you've since edited by hand.

**Splitting setup from running**, if you'd rather:

```bash
pnpm setup:local   # Docker + env files + schema + demo data — once
pnpm local         # start the app — any time after that
```

**Stopping.** `Ctrl+C` in the same terminal stops the web/API dev servers. The Docker containers
keep running in the background (so the next `pnpm local` is fast); stop those too with:

```bash
docker compose -f docker-compose.local.yml down       # stop, keep the data
docker compose -f docker-compose.local.yml down -v     # stop, wipe all local demo data
```

**How it works, if you're curious.** `docker-compose.local.yml` brings up a real local Postgres,
Redis, and ClickHouse — the same Redis/ClickHouse images `docker-compose.yml` already used for
normal dev, plus a local Postgres so this needs no Neon account at all. `packages/db/src/client.ts`
supports two Postgres drivers, chosen by `DATABASE_DRIVER`: Neon's HTTP protocol in production
(unchanged — unset behaves exactly as before this existed), or a plain `pg` connection pool for
this local Postgres, since Neon's HTTP driver can't speak to an ordinary Postgres server.
`scripts/local/setup.mjs` and `scripts/local/start.mjs` orchestrate the rest: prerequisite checks,
`.env` generation, `docker compose up -d --wait`, `db:push`, the seed script, then the dev servers.
See [Troubleshooting](#troubleshooting) if something doesn't come up clean.

## Production / Developer Setup

For working against a real Neon database, real third-party integrations, or preparing for
deployment.

Requires **Node 22+**, **pnpm**, **Python 3.12** (worker only), and **Docker** (Redis + ClickHouse).

```bash
PUPPETEER_SKIP_DOWNLOAD=true pnpm install   # see Troubleshooting re: plain `pnpm install`
docker compose up -d                        # Redis :6379, ClickHouse :8123

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# apps/api/.env needs at minimum: DATABASE_URL (a real Neon connection string),
# BETTER_AUTH_SECRET, BETTER_AUTH_URL. The API fails fast at boot listing every missing
# variable at once. Leave DATABASE_DRIVER unset — it defaults to Neon.

pnpm --filter @growthos/db db:push
pnpm dev                             # web :3000, api :3001
```

The web app also renders without a backend at all: every feature hook falls back to running the
real `@growthos/logic` engine over fixtures locally, and a `DataSourceBadge` shows which was used.

## The admin console

`/admin` is the **platform** console — GrowthOS staff looking across every customer — and is a
different product from the customer dashboard that happens to share its shell. Workspace and
account directories, per-workspace usage and billing overrides, the platform overview, the audit
log, and the blog.

**Two roles**, defined in `apps/api/src/guards.ts`: `support_agent` reads, `super_admin` writes.

**There is no bootstrap script, on purpose** — nothing that ships should be able to mint a platform
administrator. Grant the first one directly against the database:

```sql
UPDATE "user" SET platform_role = 'super_admin' WHERE email = 'you@example.com';
```

Sign in again and `/admin` will let you in — but it walls you at the door until two things are
true: your staff profile is complete, and **two-factor is enabled on your account**. Both walls
hide the console's navigation while they are up, so there is no way past them other than through.
Changing another account's billing or access additionally requires re-authenticating at the moment
of the action, not merely holding a session.

**Everything is recorded.** Every read (`workspace.view`, `user.spend.view`) and every write goes
to the audit log as it happens, and a set of sensitive actions also alerts the other super admins.
This is worth knowing before you go looking around a customer's workspace: it is not a quiet act,
and the privacy policy tells customers so.

## The public site and the blog

`app/(marketing)` is the real site: landing, pricing, FAQ, about, security, the legal pages, and
the blog. It is held to a rule worth knowing before you edit copy — **claims are limited to what
has shipped.** No GEO/AI-citation tracking, no AI image or video, no "prediction", no live
ad-platform writes, and no suggestion that an LLM writes the copy. `PLAN_LIMITS` in
`@growthos/types` is the billing contract; filter a feature out of the marketing view rather than
editing that.

**The blog is rows, not files.** Posts live in Postgres (`packages/db/src/schema/blog.ts`), are
written in the console at `/admin/blog`, and store ProseMirror JSON rather than HTML — so nothing
author-supplied is ever injected as markup, and published prose renders through the site's own
type scale. Publishing calls the web app's `/api/revalidate` route so the change appears without a
redeploy; see the `REVALIDATE_SECRET` note under [Environment Variables](#environment-variables).

```bash
# Five SEO posts, idempotent by slug. Needs apps/api/.env, hence --env-file.
pnpm --filter @growthos/api exec tsx --env-file=.env scripts/seed-blog.ts
```

SEO is not incidental here: every public page carries its own title, description and canonical URL
through `apps/web/lib/seo.ts`, `robots.ts` and `sitemap.ts` are generated, and posts emit
JSON-LD. If you add a public route, give it `pageMeta()`; if you add a signed-in one, give it
`privateMeta()` **and** add its path to `PRIVATE_ROUTES` in that same file, which is what
`robots.ts` reads.

## Commands

```bash
pnpm dev            # turbo dev, all packages
pnpm build          # turbo build
pnpm typecheck      # turbo typecheck
pnpm lint

pnpm --filter @growthos/api dev      # API only  (:3001)
pnpm --filter @growthos/web dev      # web only  (:3000)

pnpm setup:local     # Local Demo Mode: Docker + env + schema + seed data, once
pnpm local           # Local Demo Mode: start the app (runs setup first if needed)
pnpm demo            # alias for `pnpm local`
```

`pnpm dev` refuses to start if either port is already taken, naming the port, the PID and the
process holding it (`scripts/dev-preflight.mjs`). That check exists because two dev servers on
:3001 is a failure that looks like an application bug for hours — see
[Troubleshooting](#troubleshooting).

### Tests

```bash
pnpm --filter @growthos/logic test   # engine unit tests — pure, no infrastructure
pnpm --filter @growthos/db test      # the Neon retry policy
pnpm --filter @growthos/web test     # web unit tests
pnpm --filter @growthos/api test     # route + integration tests (needs Docker and a database)
```

The API suite runs against a real database — a real Neon URL, or the Local Demo Mode Postgres via
`DATABASE_URL` + `DATABASE_DRIVER=node-postgres` — so it's slower and more sensitive to network
conditions than the others when pointed at Neon. `apps/api/vitest.config.ts` documents the timeouts
and concurrency caps and why they're set where they are.

## Environment Variables

| File | Required for | Notes |
|------|--------------|-------|
| `packages/db/.env` | any standalone database access (scripts, tests, `db:push`) | `DATABASE_URL`; add `DATABASE_DRIVER=node-postgres` only when pointing at a non-Neon Postgres |
| `apps/api/.env` | the API | see `apps/api/.env.example` for the full list — every third-party key (Stripe, Resend, Sentry, Google, Meta) is genuinely optional and no-ops when blank; only `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` are required to boot |
| `apps/web/.env` | the web app | `NEXT_PUBLIC_API_URL`; `NEXT_PUBLIC_SITE_URL` (canonical URLs, `sitemap.xml`, share images — defaults to `https://growthos.app`, which is wrong for your deployment); the PostHog key is optional, and with it unset no cookie banner appears because there is no optional cookie to consent to |
| `apps/worker/.env` | the Python worker (optional — not started by `pnpm local`) | `DATABASE_URL`, `REDIS_URL`, `QUEUE_KEY`, `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT` |

`REVALIDATE_SECRET` appears in **both** `apps/api/.env` and `apps/web/.env` and the two must match:
it authenticates the call the API makes to the web app to drop a cached blog post after the console
publishes one. Both unset is a supported state — the call is skipped and the public blog picks the
change up on its own five-minute cycle.

In Local Demo Mode, `scripts/local/setup.mjs` generates all four files for you, with fresh random
secrets, and never overwrites one that already exists. In production, generate secrets yourself:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"    # BETTER_AUTH_SECRET, OAUTH_STATE_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" # TOKEN_ENCRYPTION_KEY
```

## Troubleshooting

**`pnpm install` fails or hangs partway through, mentioning Puppeteer / Chromium.** Puppeteer
(used for PDF export, `apps/api/src/pdf-report-generate.ts`) tries to download a Chromium build on
install, which can hard-fail the entire `pnpm install` on a restricted or flaky network.
`apps/api/.puppeteerrc.cjs` is meant to skip that by default, but in this pnpm workspace layout the
config file isn't reliably picked up (Puppeteer's own postinstall script runs from deep inside
pnpm's virtual store, not from `apps/api/`) — so for a plain `pnpm install`, set the environment
variable explicitly:

```bash
PUPPETEER_SKIP_DOWNLOAD=true pnpm install
```

`pnpm local` / `pnpm setup:local` already do this for you. To actually use PDF export locally
afterward: `npx puppeteer browsers install chrome`.

**Docker isn't installed, or isn't running.** `pnpm local` detects which of these is true and
prints exactly what to run — see [Quick Start](#quick-start) — rather than a Node stack trace.

**A container won't become healthy.**

```bash
docker compose -f docker-compose.local.yml ps
docker compose -f docker-compose.local.yml logs
```

The most common cause is a conflicting local service. Local Demo Mode's Postgres listens on
**5433**, not 5432, specifically to avoid clashing with a system Postgres — but Redis (6379) and
ClickHouse (8123/9000) use their normal ports, so free those up (or edit the `ports:` in
`docker-compose.local.yml`) if something else already has them.

**Want a clean slate?**

```bash
docker compose -f docker-compose.local.yml down -v   # wipes all local demo data
rm apps/api/.env apps/web/.env packages/db/.env apps/worker/.env
pnpm setup:local
```

**The API prints its command line and then nothing.** It is not up. The API logs
`Server listening at http://127.0.0.1:3001` on success, and silence after the `@growthos/api:dev:`
line is the symptom rather than normal output. `curl localhost:3001/health` tells you which:
JSON means the API owns the port, HTML means something else grabbed it — Next auto-increments to
3001 when 3000 is busy, and on Windows the second bind succeeds silently, so two processes can
listen at once. Kill stale dev servers before restarting. This is what `pnpm dev`'s port preflight
now prevents.

**Every page renders unstyled, or requests die with `__webpack_modules__[moduleId] is not a
function`.** Not an application bug. `apps/web/next.config.mjs` writes to `.next-dev` in
development and `.next` in production precisely so a production build cannot corrupt a running dev
server — if you see either symptom, stop the dev server, delete both directories, and restart
rather than debugging the app. The same remedy applies after `node_modules` churns under a running
dev server, which surfaces as `Jest worker encountered N child process exceptions` on dynamic
routes while static ones still return 200.

**A wall of Better Auth *client* type errors** — `organizationClient()` not assignable to
`BetterAuthClientPlugin` — usually with `phone` and `platformRole` vanishing from `session.user` in
pages that never touched auth. The cause is two copies of `@better-fetch/fetch`: `better-call` asks
for `^1.1.21` while `better-auth` pins an exact version, so a plugin built by one copy is a
structurally different type from the one the other expects. `apps/web` must keep a direct
dependency on the version `better-auth` uses. `pnpm dedupe` does **not** fix it — the lockfile
already satisfies `^1.1.21`, so there is nothing to dedupe.

**`pnpm local` says the app didn't come up in time.** The dev servers are almost always still
starting in the same terminal — scroll up for the actual error, or wait a few more seconds and
open the URLs directly. If the API's own error mentions a specific missing environment variable,
that's the real cause; `apps/api/src/env.ts` fails fast and names exactly what's missing rather
than crashing further downstream.

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

Known-open bugs and gaps live in `docs/AUDIT-*.md` — start with
[`AUDIT-2026-08-13-codebase.md`](docs/AUDIT-2026-08-13-codebase.md) for the whole-codebase pass;
the dated per-module audits alongside it record what each dashboard page was found doing wrong and
what was done about it.

## Layout

```
apps/
  api/       Fastify 5 — REST at /api/v1, admin at /admin, Better Auth at /api/auth/*,
             WebSocket, public API
  web/       Next 15 · React 19 · Tailwind v4 · shadcn/ui
    (marketing)/  the public site — landing, pricing, FAQ, legal, and the blog
    (auth)/       sign-in, sign-up, two-factor, and the onboarding steps
    (dashboard)/  the product
    (admin)/      the platform console — staff only, see "The admin console" below
  worker/    Python — consumes a Redis job-bridge; owns crawling, syncs, and data work
packages/
  logic/     @growthos/logic — the canonical business engines, pure and unit-tested
  db/        @growthos/db — Drizzle schema + Neon (or local Postgres) client + migrations
  types/     @growthos/types — request/response and domain types shared across api and web
  ui/        @growthos/ui — shared shadcn primitives
  config/    shared TypeScript base config
scripts/
  local/     Local Demo Mode orchestration (`pnpm setup:local` / `pnpm local`)
```

**`packages/logic` is where the product actually lives** — SEO scoring, the paid↔organic bridges,
creative fatigue, blended MER, the cross-channel rule registry, the ads advisors, attribution, and
the automation planner. Pure functions, no I/O, consumed by both the API and the web app. The same
logic exists as ports inside `/legacy`; these copies are canonical.

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
- **Channel slugs never reach the screen.** `google_ads` / `meta_ads` / `organic` are the storage
  and API form; anything a person reads goes through `channelLabel()` in `packages/logic`,
  generated prose included — the weekly report is also rendered into a customer-facing PDF.
- **Register every new schema file in `packages/db/drizzle.config.ts`.** A file missing from that
  array makes `drizzle-kit generate` emit a `DROP TABLE` for it.
- **Seeded demo figures are defined once**, in `packages/logic/src/fixtures/seed.ts`, because the
  API inserts from it into ClickHouse and the web app reads it for the offline fallback. Every
  past copy of that arithmetic drifted and made the product visibly different offline. Import
  them; never re-derive them.

## Where the project is

**M4 — Automation & Scale.** `P4.4a` complete; the remaining M4 work is externally gated.
`docs/plan/PROGRESS.md` is the authority and is kept current — this section is a summary of it.

Built and working: the platform spine (auth, workspaces, tenancy, **two-factor with step-up
re-authentication**), the full insight loop across all three channels, the intelligence engine and
its scheduled autonomous loop, agency features (collaboration, audit log, white-label, PDF export),
billing and plan metering, the public API with per-key rate limits, outbound webhooks, team
invitations, keyword clustering, brand guidelines, the creative scorecard and variant experiments,
site audit and Core Web Vitals, and P4.3a's automation control plane — rules, a planner, an
approval queue, and an execution ledger.

Since M5 closed, the work has been the two surfaces a launch needs and neither milestone owned:
the **platform admin console** (directories, overview, audit log, staff 2FA — see
[The admin console](#the-admin-console)) and the **public site** — landing, pricing, FAQ, legal
pages, a database-backed blog with an editor in the console, per-page SEO, and cookie consent that
actually gates the analytics SDK.

Not built: live Google Ads and Meta *write* adapters, AI image/video generation, GEO tracking, and
the mobile app. Most are blocked on external credentials — a Google Ads developer token, Meta App
Review, a paid generation API — rather than on engineering. **Every OAuth scope the app requests
today is read-only**, which is why the Terms and the security page say GrowthOS cannot change a bid
or spend budget; if a write adapter ever lands, both of those documents have to change with it.

The legal pages carry unfilled placeholders — company legal name, jurisdiction, contact addresses,
effective date — gathered in `apps/web/lib/legal.tsx` and rendered as visible gold gaps. They are
not guessable, and they must be filled before those pages go live.

The important caveat: **most channel data is currently seeded, not live.** Google Search Console is
the only real provider wired end to end. Everything else computes over fixtures or seeded ClickHouse
rows, which is why the app looks complete while the numbers are not yet yours. (Local Demo Mode
leans into this deliberately — see [Local Demo Mode](#local-demo-mode).)

## Contributing

Work happens on `shihab-restructure`; `main` holds the pre-restructure state. When you finish a
subphase, tick its boxes in the phase `plan.md` and roll the status up through that phase's
`progress.md`, the milestone `progress.md`, and `docs/plan/PROGRESS.md`. Those documents are the
project's memory — code that ships without them gets rediscovered and rebuilt.
