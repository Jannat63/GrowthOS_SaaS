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
- [ ] **Dress up — not started.** DB-level RLS hardening, OAuth buttons, email verification, live third-party APIs (Google Ads/Meta/DataForSEO), deployment, monitoring, billing (Stripe)

## Run everything locally
```
docker compose up --build
```
This starts Postgres (auto-seeded with a demo workspace), Redis, ClickHouse, all 6 backend services, the API gateway (:8000), and the web app (:3000).
