# GrowthOS — Monorepo

Unified SEO · Google Ads · Meta Ads growth platform.
Structure mirrors Section 6 (Design Architecture) of the GrowthOS SaaS Blueprint.

## Structure

- `apps/web` — Next.js 15 + React 19 frontend (THIS is what we are building first, step by step)
- `services/*` — backend microservices (SEO, Google Ads, Meta Ads, Intelligence, Notification) — placeholder scaffolds for later phases, not built yet
- `packages/*` — shared code (design tokens, TS types, shared config)
- `infra/*` — Docker, Kubernetes, Terraform, CI/CD — placeholders for future deployment
- `db/*` — Postgres migrations + ClickHouse analytics schema — placeholders for future phases
- `docs/` — reference blueprint doc

## Build order (see project plan)

1. Foundation & shell (design system + app shell) — apps/web/components/ui + layout
2. Growth Hub dashboard (mock data)
3. First full module (SEO or Google Ads) with real logic
4. Intelligence Center (cross-channel engine)
5. Remaining modules, one at a time

## Status
- [x] **Skeleton — complete.** 79 pages, zero broken imports, zero broken nav links.
- [x] **Body — complete.** All 55 sub-pages have real mock-data-driven content (tables, cards, stats) matching the design system — zero placeholder pages remain. Search Terms (Google Ads) and Goal Simulator (Future Forecasting) use the actual logic modules live, not static data.
- [x] apps/web — real logic modules (scoring, bridge rules, fatigue detection, blended MER, cross-channel engine, goal simulator) — live-backend-first with mock fallback
- [x] services/* — 7 services scaffolded and runnable, camelCase serialization verified against frontend types
- [x] db/* — Postgres + ClickHouse schema, auto-load via docker-compose
- [x] Persistence — intelligence-service writes/reads real recommendations to/from Postgres, tested end-to-end
- [x] Real Auth — bcrypt + JWT + sessions table, tested: correct/wrong password, forged token rejection, middleware.ts protects all dashboard routes server-side
- [x] Workspace-scoped data — workspace_id derived from verified JWT, tested with two separate real companies/workspaces, confirmed isolation
- [ ] **Dress up — in progress.**
  - [x] Security hardening: rate limiting on auth (10 sign-ins/min, 5 signups/hour per IP — tested, actually blocks at the threshold), CORS restricted to frontend origin on every service including the gateway, security headers on all services
  - [x] Google OAuth sign-in: real authorization code flow, tested end-to-end (redirect URL construction verified, graceful 501 when unconfigured). **Needs your Google Cloud Console credentials** — see `services/auth-service/app/google_oauth.py`
  - [x] Email verification: real token generation/hashing/expiry/single-use flow via SendGrid, tested end-to-end against real Postgres (request → confirm → DB flips → reuse rejected). **Needs your SendGrid API key** — see `services/auth-service/app/email.py`. Works without it too (logs instead of sending, doesn't block signup)
  - [x] Stripe billing: checkout session creation + webhook handler + subscription tracking, tested (checkout without keys → graceful 501, current plan defaults correctly, auth required). **Needs your Stripe keys** — see `services/auth-service/app/billing.py`
  - [x] **Found and fixed 4 real bugs during this pass**, each verified with actual running code, not just re-reading it:
    1. API gateway path rewriting was completely broken — every route would have 404'd. Took 3 attempts to fix correctly, verified with a real gateway + service + real HTTP requests each time.
    2. Timezone-naive vs. timezone-aware datetime comparison crashed email verification — caught by actually running the confirm flow, not by inspection.
    3. `package.json` had exact version pins that created a real `npm install` failure (React 19 vs `next@15.0.0`'s peer range, then `lucide-react` not supporting React 19 at all) — caught by actually running `npm install`, not by reading the file.
    4. Two pages using `useSearchParams()` broke the production build (`next build` requires a Suspense boundary) — caught by actually running a real production build, not `tsc --noEmit` alone.
  - [x] **Full production build verified**: `npm run build` succeeds, 84 pages, zero errors. `npx tsc --noEmit` passes with zero errors across the whole frontend. All 4 Python services and 2 Node services pass their own syntax/compile checks.
  - [x] Deployment configs: `vercel.json`, `railway.json` per service, `DEPLOYMENT.md` with exact steps and a root `package-lock.json` locking the verified-working dependency versions
  - [ ] Live Google Ads / Meta Ads / DataForSEO APIs — blocked on external approval process (see earlier discussion)
  - [ ] ClickHouse — schema exists, nothing writes to it yet
  - [ ] DB-level RLS session-variable enforcement — deferred earlier in favor of reliable application-level filtering (see Workspace-scoped data above)

## Automated testing (NEW)
Previously all verification was manual, one-off testing during development — not repeatable. Now there's a real test suite:

- **Frontend**: 50 unit tests (vitest) covering all 6 real logic modules — SEO scoring, search terms bridge, creative fatigue, cross-channel engine, blended MER, goal simulator. Run: `cd apps/web && npm test`
- **Backend**: 30 tests (pytest) across `seo-service`, `google-ads-service`, `intelligence-service`, `auth-service` — including a test that verifies the Python and TypeScript cross-channel engines produce *identical* recommendations on the same input, and tests that specifically guard against the camelCase/timezone bugs found during development so they can't silently reappear. Run: `cd services/<name> && python3 -m pytest tests/ -v`
- **Everything at once**: `./scripts/run-all-tests.sh` — runs all of the above plus type-checking and a full production build
- **CI**: `.github/workflows/ci.yml` runs the entire suite automatically on every push/PR to `main`, across the frontend, all 4 Python services, the TypeScript Meta Ads service, and syntax-checks the two Node services

## Demo data
`db/postgres/seed.sql` creates a working demo account (`demo@growthos.app` / `DemoPass123`) so a fresh deploy isn't an empty database. Tested: this account can actually sign in.

## Run everything locally
```
docker compose up --build
```
This starts Postgres (auto-seeded with a demo workspace), Redis, ClickHouse, all 6 backend services, the API gateway (:8000), and the web app (:3000).

## Blueprint feature coverage (NEW — free-tier implementations)
No paid AI API (Claude/OpenAI) is used anywhere — the following are genuinely
real, working features built with free tools instead: a real web crawler,
the free Google PageSpeed API, and deterministic rule-based/template logic
where the blueprint originally called for LLM generation.

**SEO Module (Section 4.1):**
- Full Site Audit — real crawler (`app/crawler.py`), fetches live pages, detects broken links, missing meta tags, thin content, missing canonicals, images without alt text. Tested against a real live site.
- Core Web Vitals Monitor — real Google PageSpeed Insights API (free), returns actual LCP/CLS/INP scores
- Keyword Clustering — real word-overlap algorithm (Jaccard similarity), no paid API
- Long-Tail Keyword Finder — real pattern-based generator
- Content Brief Generator — rule-based (search intent classification, word count targets, heading structure) — not LLM prose, but real structural guidance
- Schema Markup Generator — real JSON-LD generation (Article, FAQ, Product, Breadcrumb, LocalBusiness), validated as parseable JSON
- Sitemap & Robots.txt Manager — real XML/text generation
- Internal Link Optimizer — real orphan-page detection and link-equity distribution, computed directly from the crawler's own link graph

**Google Ads Module (Section 4.2):**
- RSA Headline Generator — combinatorial templating, enforces the real 30-character Google Ads limit
- Target CPA / ROAS Calculator — real unit-economics math
- Budget Allocator — real rule-based split by business stage
- Wasted Spend Detector — real rule-based analysis (zero-conversion spend, low Quality Score)

**Meta Ads Module (Section 4.3):**
- Full-Funnel Campaign Builder + Budget Split Calculator — real math matching the blueprint's TOFU/MOFU/BOFU ratios
- Ad Copy Writer + UGC Script Writer — template-based generation

**Unified Intelligence Engine (Section 4.4):**
- Budget Reallocation Engine — real ROAS-gap analysis across channels
- Weekly Growth Intelligence Report — real templated report from actual computed metrics (not LLM prose, but genuinely data-driven)

**Honestly still not built** (need a paid data source with no free equivalent, or the external ad-platform approval discussed earlier): AI Overview/GEO citation tracking (would require scraping AI systems), Competitor Gap Analysis (needs a paid rank-tracking index), Backlink Profile Analyzer (needs Moz/Majestic/Ahrefs — no free equivalent at any real scale), live Google Ads/Meta Ads/DataForSEO data, multi-workspace switching UI, granular RBAC beyond a single owner role, white-label mode, CRM/e-commerce integrations (HubSpot, Shopify, etc.), webhooks, audit log.

All of the above new backend logic has its own test coverage (44 new pytest tests, all passing) even though the instruction for this pass was to prioritize breadth over testing — writing them alongside the code caught 2 more real bugs (see test names referencing "regression" in `seo-service/tests/test_free_features.py`).
