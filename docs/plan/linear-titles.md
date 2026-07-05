# Linear — Milestones & Phases

## M0 — Foundation & Restructure
Stand up the new Turborepo, preserve the old build under `/legacy` as reference, and put a living plan/progress system in place.

- P0.1 — Monorepo & legacy
Move all old code → `/legacy`; import + amend blueprint docs; write DECISIONS.md (D1–D6).

- P0.2 — API + web scaffold
Turborepo root + `packages/config`; Fastify `apps/api` with `/health` verified; `apps/web` carried forward, builds (80+ pages).

- P0.3 — Planning & docs system
`docs/plan/` milestone→phase→subphase tracker + `progress.md` at every level; CLAUDE.md.

## M1 — Platform Spine
Real database, real auth, shared packages, and the frontend wired to the new Fastify API.

- P1.1 — packages/db (Drizzle + Neon)
Create `packages/db`: drizzle-orm + `@neondatabase/serverless` + drizzle-kit; Neon client; tenancy schema (workspaces, workspace_members, platform_connections) reconciled with Better Auth tables; generate + push migration.

- P1.2 — Better Auth + workspaces
better-auth in `apps/api` with Drizzle/Neon adapter, email/password; organization plugin → workspaces/members/roles; mount `/api/auth/*`; secrets.

- P1.3 — Fastify domain skeleton
Plugins (db, session-verify, cors, typed error envelope); `requireWorkspaceMember(role)` guard; routes `GET /api/v1/auth/me`, `POST/GET /workspaces`, `GET /workspaces/:id/connections`; zod validation; start `packages/types`.

- P1.4 — Web re-point to API
Swap `lib/api/client.ts` to Fastify `/api/v1`; replace localStorage-JWT with Better Auth client; update sign-in/up pages; `middleware.ts` on Better Auth session; keep live→mock fallback.

- P1.5 — shadcn/ui foundation
Init shadcn in `apps/web`; create `packages/ui`; decide Tailwind v3→v4; add core primitives (button, input, card, dialog, dropdown, table, tabs, toast) replacing existing `components/ui`.

## M2 — MVP: The Insight Loop
Prove the cross-channel insight loop end-to-end and reach launch readiness: onboarding → cross-channel recommendations → MER dashboard → subscribe.

- P2.1 — Worker & data plumbing
`apps/worker` (Celery + Redis broker, FastAPI health); job pattern (Fastify → BullMQ → Celery → Neon → `202 {jobId}` + `/jobs/:jobId`); `background_jobs` table; local ClickHouse; platform_connections + OAuth.

- P2.2 — Onboarding Wizard
Onboarding fields on `workspaces`; wizard steps 1–7; site-crawler worker; channel-mix + 90-day strategy (deterministic templates); land on dashboard with 5 seeded recs.

- P2.3 — Paid-to-Organic Bridge
`recommendations` + `content_briefs` tables; search-terms scoring worker; `GET /workspaces/:id/google-ads/search-terms`; rule-based brief generator; Content Pipeline UI; dismiss/snooze/act.

- P2.4 — Organic-to-Paid Bridge
Daily GSC top-pages worker; Meta creative-brief generator (templated); Creative Queue UI; CTR>3% reverse-loop → SEO brief.

- P2.5 — Creative Fatigue Monitor
`meta_ad_sets` table; 4-hourly fatigue worker; alert (freq>3 & CTR −20% WoW); email + WebSocket `meta:fatigue_alert`; alert-card UI.

- P2.6 — Blended MER Dashboard
Revenue entry + Shopify pull; MER calc; `GET /analytics/mer` (ClickHouse + revenue); Recharts 30/60/90 trend; anomaly >15% WoW.

- P2.7 — Unified Dashboard + notifications
Growth-hub KPI cards; impact-sorted recommendation queue by `composite_score`; WebSocket notification center; real-time client.

- P2.8 — Billing & launch readiness
`subscriptions` + `usage_records`; Stripe checkout + webhook; metering + `PLAN_LIMIT_REACHED` (402); white-label PDF; security + perf pass; workspace settings.

## M3 — V1: Full Channel Coverage
Full depth on each channel. Gate to start: 500 users / MRR >$50K / agency tier.

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
