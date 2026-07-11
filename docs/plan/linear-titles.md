# Linear — Milestones & Phases

## M0 — Foundation & Restructure
Stand up the new Turborepo, preserve the old build under `/legacy` as reference, and put a living plan/progress system in place.

- P0.1 — Monorepo & legacy
Move all old code → `/legacy`; import + amend blueprint docs; write DECISIONS.md (D1–D6).

- P0.2 — API + web scaffold
Turborepo root + `packages/config`; Fastify `apps/api` with `/health` verified; `apps/web` carried forward, builds (80+ pages).

- P0.3 — Planning & docs system
`docs/plan/` milestone→phase→subphase tracker + `progress.md` at every level; CLAUDE.md.

## M1 — Platform Spine ✅ Complete
Real database, real auth, shared packages, and the frontend wired to the new Fastify API. Delivered in two frontend slices on the rebuilt stack (Next 15 / Tailwind v4 / shadcn — D5 reversed): **Slice 1** = P1.5 (shadcn), P1.6 (landing), P1.4a (login/onboarding); **Slice 2** = the dashboard shell + Growth Hub + P1.4b (data layer re-pointed to `/api/v1`). Backend: P1.1 (db), P1.2 (auth), P1.3 (`/api/v1`).

- P1.1 — packages/db (Drizzle + Neon)
Create `packages/db`: drizzle-orm + `@neondatabase/serverless` + drizzle-kit; Neon client; tenancy schema (workspaces, workspace_members, platform_connections) reconciled with Better Auth tables; generate + push migration.

- P1.2 — Better Auth + workspaces
better-auth in `apps/api` with Drizzle/Neon adapter, email/password; organization plugin → workspaces/members/roles; mount `/api/auth/*`; secrets.

- P1.5 — shadcn/ui foundation
Init shadcn in `apps/web`; create `packages/ui`; decide Tailwind v3→v4; add core primitives (button, input, card, dialog, dropdown, table, tabs, toast) replacing existing `components/ui`. (Prerequisite for the landing page.)

- P1.6 — Landing page
Public marketing homepage at `/` (replace the `/welcome` redirect): hero, per-channel feature sections (SEO / Google Ads / Meta Ads), how-it-works, pricing teaser, social proof, footer, CTAs → sign-up/sign-in. Built shadcn-first; placeholder brand/copy the user swaps later.

- P1.4a — Web login
Better Auth React client on `apps/web` pointed at Fastify; wire sign-in/up pages to real auth; back `middleware.ts` with the Better Auth session; retire the legacy localStorage-JWT path.

- P1.3 — Fastify domain skeleton
Plugins (db, session-verify, cors, typed error envelope); `requireWorkspaceMember(role)` guard; routes `GET /api/v1/auth/me`, `POST/GET /workspaces`, `GET /workspaces/:id/connections`; zod validation; start `packages/types`.

- P1.4b — Web data re-point
Swap `lib/api/client.ts` base to Fastify `/api/v1`; point the dashboard data hooks at the real endpoints; keep the live→mock fallback + DataSourceBadge.

## M2 — MVP: The Insight Loop
Build the whole basic app on SEEDED DATA and prove the cross-channel loop end-to-end: onboarding → cross-channel recommendations → act on them → MER dashboard. Each feature is a full vertical slice (worker + API + UI). NO billing (→ M5). NO real OAuth (→ M3 P3.0). Replanned 2026-07-12.

- P2.1 — Worker & data plumbing
`apps/worker` (Celery + Redis broker, FastAPI health); job pattern via an explicit shared Redis contract — NOTE BullMQ and Celery are not wire-compatible, do not bridge them directly; `background_jobs` table; local SEEDED ClickHouse; SEEDED `platform_connections` stubs (real OAuth deferred to M3 P3.0). Prereqs: Python 3.12 (on 3.14), Docker, Upstash Redis.

- P2.2 — Onboarding Wizard
Onboarding fields on `workspaces`; 7-step wizard UI; site-crawler worker; channel-mix + 90-day strategy (deterministic templates); land on dashboard with 5 seeded recs.

- P2.3 — Paid-to-Organic Bridge
`recommendations` + `content_briefs` tables; search-terms scoring worker; `GET /workspaces/:id/google-ads/search-terms`; rule-based brief generator; Content Pipeline UI; dismiss/snooze/act.

- P2.4 — Organic-to-Paid Bridge
Daily GSC top-pages worker; Meta creative-brief generator (templated); Creative Queue UI; CTR>3% reverse-loop → SEO brief.

- P2.5 — Creative Fatigue Monitor
`meta_ad_sets` table; 4-hourly fatigue worker; alert (freq>3 & CTR −20% WoW); email + WebSocket `meta:fatigue_alert`; alert-card UI.

- P2.6 — Blended MER Dashboard
Revenue entry; MER calc; `GET /analytics/mer` (seeded ClickHouse + revenue); Recharts 30/60/90 trend UI; anomaly >15% WoW. (Live Shopify pull deferred to M3.)

- P2.7 — Unified Dashboard + notifications
Growth-hub KPI cards; impact-sorted recommendation queue by `composite_score`; WebSocket notification center; real-time client.

- P2.8 — Hardening & polish (no billing)
Security pass (secret handling, workspace scoping, rate limiting); perf pass (<2s dashboards); workspace settings (invites/roles); optional white-label PDF (Puppeteer). Billing/Stripe MOVED to M5.

## M3 — V1: Full Channel Coverage
Full depth on each channel, and the app goes live-data. Gate to start: 500 users / MRR >$50K / agency tier.

- P3.0 — Real platform integrations (OAuth)
Real connect/disconnect + encrypted tokens for Google Ads / Meta / GSC / Shopify; live sync workers replacing the M2 seeded fixtures; account-registration paperwork (Meta App Review, Google Ads dev token — start early, they take weeks). Deferred out of M2 P2.1.

- P3.1 — SEO module
DataForSEO keywords, rank tracking, site audit, Core Web Vitals, clustering (pgvector), backlinks, schema, internal links, content editor, GEO citation tracker.

- P3.2 — Google Ads module
AI campaign builder, RSA generator, PMax, bidding advisor (tCPA/tROAS), Quality Score, Enhanced Conversions, Customer Match, wasted-spend detector.

- P3.3 — Meta Ads module
Full-funnel builder + budget split, audiences, AI image gen, UGC scripts, CAPI wizard, EMQ optimizer, overlap detector.

- P3.4 — Intelligence Engine V1
47-rule engine + 4-hourly loop, recommendation explanations, Weekly Growth Intelligence Report, budget reallocation.

- P3.5 — Agency features
White-label (domain/logo/colors), team comments + task assignment, `audit_logs`, multi-workspace UI polish.

## M4 — V2: Automation & Scale
Automation and scale. Gate to start: 2,000 users / MRR >$200K.

- P4.1 — Cross-channel attribution
Unified ClickHouse event schema, journey reconstruction, multi-touch model, attribution dashboard, MER v2, CRM integrations.

- P4.2 — AI creative automation
15–25 image variants/week, brand-guidelines system, performance prediction, video script→storyboard, UGC A/B testing.

- P4.3 — Automated campaign management
AI action mode, auto pause/scale, auto-refresh creatives, approval workflow + daily batches, automation audit log.

- P4.4 — GEO tracking + public API
Daily AI-citation monitoring, competitor GEO, AEO recs, public REST API (Scale tier), OpenAPI + webhooks.

- P4.5 — Mobile app
iOS + Android (Expo/RN) dashboard, recommendations, push, mobile report viewer.

## M5 — Launch & Monetization
DEFERRED — not launching this season. The billing/launch work pulled out of M2 P2.8 so the basic app is built first. Independent of M3/M4 — pull forward when a launch is scheduled.

- P5.1 — Billing core
`subscriptions` + `usage_records` tables; Stripe checkout + webhook; trial→paid lifecycle (reuse `legacy/services/auth-service/billing.py` as spec).

- P5.2 — Plan limits & metering
Usage metering; `PLAN_LIMIT_REACHED` (HTTP 402) enforcement; in-app upgrade prompts.

- P5.3 — Customer portal & lifecycle emails
Stripe customer portal; Resend trial / dunning / receipt emails.

- P5.4 — Launch readiness
Final security + perf hardening beyond M2; legal/pricing pages; analytics; go-live checklist.
