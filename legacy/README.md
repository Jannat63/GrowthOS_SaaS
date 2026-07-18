# GrowthOS

[![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A unified SEO · Google Ads · Meta Ads growth platform — a working full-stack
application (Next.js frontend, 7 backend microservices, Postgres), not a
mockup. 102 automated tests, CI on every push. Implements a free-tier
version of the product blueprint in [`docs/`](docs) — no paid AI API is used
anywhere; real logic (a real web crawler, the free Google PageSpeed API,
rule-based generators) stands in for the blueprint's LLM-powered features.

> **Before pushing**: replace `YOUR_USERNAME/YOUR_REPO` in the badge URL above with your actual GitHub path so the CI badge resolves.

## Quick start

```bash
git clone <this-repo-url>
cd growthos
docker compose up --build
```

In a second terminal, seed a demo account:
```bash
docker exec -i $(docker compose ps -q postgres) psql -U growthos -d growthos < db/postgres/seed.sql
```

Open **http://localhost:3000** and sign in with `demo@growthos.app` / `DemoPass123`.

Something not working? Check **Troubleshooting** in [`DEPLOYMENT.md`](DEPLOYMENT.md) first — it covers the issues people have actually hit running this locally.

## Run the tests

```bash
./scripts/run-all-tests.sh
```
Or individually:
- Frontend: `cd apps/web && npm test` (vitest, 50 tests)
- Backend: `cd services/<name> && python3 -m pytest tests/ -v` (pytest, 52 tests across `auth-service`, `seo-service`, `google-ads-service`, `intelligence-service`)

CI (`.github/workflows/ci.yml`) runs all of this automatically on every push/PR to `main`.

## What's actually real here

Try these — they call live backend logic, not mock data:
- **SEO → Site Audit**: paste any real URL, it genuinely crawls it live and reports real issues
- **SEO → Technical SEO**: real Google PageSpeed Insights API call for Core Web Vitals
- **Google Ads → Ads & Creatives**: real RSA headline generator (enforces the actual 30-char limit)
- **Meta Ads → Creative Library**: real ad copy / UGC script generation
- **Intelligence Center → AI Reports**: real weekly report computed from actual channel numbers

Full breakdown of what's real vs. mock vs. not-yet-built is in [`CHANGELOG.md`](CHANGELOG.md).

## Structure

```
apps/web/       Next.js 15 + React 19 frontend — 81 pages, real content, live-backend-first with mock fallback
services/       7 backend microservices, each with real logic and its own test suite:
  auth-service          bcrypt + JWT auth, email verification, Google OAuth, Stripe billing
  seo-service            real crawler, PageSpeed API, keyword clustering, content briefs, schema gen
  google-ads-service     search terms bridge, RSA generator, budget allocator, wasted spend detector
  meta-ads-service       creative fatigue detection, funnel builder, ad copy generator (NestJS)
  intelligence-service   cross-channel recommendation engine, budget reallocation, weekly reports
  notification-service   Socket.io real-time alerts (built, not yet wired into the frontend)
  api-gateway            routes /api/* to the services above
db/              Postgres schema (17+ tables) + ClickHouse schema (not yet wired to anything)
docs/            The original product blueprint this implements a free-tier version of
scripts/         run-all-tests.sh — the whole test suite in one command
```

`packages/*` and `infra/k8s`, `infra/terraform` are placeholders for a future, larger-scale deployment — not used by the current Docker Compose setup.

## Current status

- **Skeleton & body**: complete — all 81 pages have real content, zero broken imports/links
- **Core logic**: real (see "What's actually real" above) — SEO scoring, search terms bridge, creative fatigue detection, the cross-channel intelligence engine, blended MER, and more, all implemented without a paid AI API
- **Auth, persistence, workspace isolation**: real and tested — bcrypt/JWT, Postgres-backed, verified with two separate real workspaces to confirm data isolation
- **Security**: rate limiting, CORS, security headers — tested, not assumed
- **Not yet done**: live Google Ads/Meta Ads/DataForSEO APIs (blocked on external app-review processes), ClickHouse wiring, multi-workspace switching UI, granular RBAC, white-label mode, CRM/e-commerce integrations

Full history of what was built, tested, and fixed (including real bugs found via actual local testing on a real machine) is in [`CHANGELOG.md`](CHANGELOG.md).

## Deploying

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for Railway (backend) + Vercel (frontend) instructions, plus local Docker troubleshooting.

## License

MIT — see [`LICENSE`](LICENSE).
