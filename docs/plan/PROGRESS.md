# GrowthOS — Master Progress Dashboard

Overall status: **🟨 In progress** — M0 done; **M1 COMPLETE**; **M2 COMPLETE** (seeded Insight Loop MVP,
P2.1–P2.8); **M3 IN PROGRESS** — every channel module now has a live UI (P3.0 OAuth built, live pending
Google creds; P3.1 SEO, P3.2 Google Ads, P3.3 Meta advisors, P3.4 Intelligence V1, **P3.5 agency complete (A+B+C1+C2)** all
done — remaining M3 work is external-gated). **M4 started early** — P4.1 cross-channel attribution done.
M5 not started.
M2 replanned 2026-07-12: seeded-data vertical slices, **no billing** (→ new **M5**), **real OAuth → M3 P3.0**.
**Real-time WebSocket layer landed 2026-07-23** (cross-cutting) — closes the WS deferrals from M2 P2.7 and M3 P3.4.
·  Updated: 2026-07-23

Status legend: `[ ]` Not started · `[~]` In progress · `[x]` Done · `[!]` Blocked (note blocker)

## M0 — Foundation & Restructure  🟨 In progress

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P0.1 | Monorepo & legacy | [x] | Code moved to `/legacy`; blueprint imported; DECISIONS.md written. |
| P0.2 | API + web scaffold | [x] | Turborepo + `packages/config`; Fastify `/health` verified; `apps/web` builds. |
| P0.3 | Planning system | [~] | This `docs/plan/` structure. |

## M1 — Platform Spine  ✅ Complete

Rows in **execution order** (UI-front-loaded now that auth is done: shadcn → landing → login). IDs stable.

| # | Phase | Name | Layer | Status | Notes |
|---|-------|------|-------|--------|-------|
| 1 | P1.1 | packages/db (Drizzle + Neon) | 🔧 BE | [x] | Tenancy schema live on Neon; migration applied; write/read verified. |
| 2 | P1.2 | Better Auth + workspaces | 🔧 BE | [x] | Live on Neon; sign-up + create-workspace(owner) verified. |
| 3 | P1.5 | shadcn/ui foundation | 🎨 FE | [x] | Via Frontend Rebuild Slice 1 (`packages/ui`, Tailwind v4 tokens). |
| 4 | P1.6 | Landing page | 🎨 FE | [x] | Via Slice 1 — redesigned (loop signature, bento, ink bands). |
| 5 | P1.4a | Web login | 🎨 FE | [x] | Via Slice 1 — auth + onboarding; browser→Neon verified. |
| 6 | P1.3 | Fastify domain skeleton | 🔧 BE | [x] | `/api/v1` + member guard + `@growthos/types`; verified (member/403/401). |
| 7 | P1.4b | Web data re-point | 🎨 FE | [x] | Via Slice 2 — dashboard shell + Growth Hub; `lib/api`→`/api/v1`, hooks live/mock via `liveOrMock`, `DataSourceBadge`. |

## M2 — MVP: The Insight Loop  ✅ Complete

Build the whole basic app on **seeded data**, each feature a full **vertical slice** (BE + FE).
**No billing** (→ M5). **No real OAuth** (→ M3 P3.0). Critical path:
`P2.1 → P2.2 → {P2.3, P2.4, P2.5, P2.6 ∥} → P2.7 → P2.8`.

| Phase | Name | Layer | Status | Notes |
|-------|------|-------|--------|-------|
| P2.1 | Worker & data plumbing | 🔧 BE | [x] | **Done 2026-07-17.** Plain Python worker (not Celery) + Redis job-bridge (JSON envelope), `background_jobs`, **seeded** ClickHouse (60 rows) + stub `platform_connections`. Local Redis/ClickHouse via Docker. E2E verified. |
| P2.2 | Onboarding Wizard | 🔁 Slice | [x] | **Done 2026-07-17.** Wizard → real pipeline (stub crawl → strategy → review → gate). Recs deferred to P2.3. |
| P2.3 | Paid-to-Organic Bridge | 🔁 Slice | [x] | **Done 2026-07-17.** Shared `@growthos/logic`; `recommendations` + `content_briefs`; live recommendations queue; search-terms surface; Content Pipeline page with act/dismiss/snooze. |
| P2.4 | Organic-to-Paid Bridge | 🔁 Slice | [x] | **Done 2026-07-17.** Meta creative briefs from top organic pages; Creative Queue page w/ act/dismiss/snooze. |
| P2.5 | Creative Fatigue Monitor | 🔁 Slice | [x] | **Done 2026-07-17.** Fatigue surface + `fatigue_alert` recs; Fatigue Monitor page. Scheduled worker/email/WS → M3/M5/P2.7. |
| P2.6 | Blended MER Dashboard | 🔁 Slice | [x] | **Done 2026-07-17.** MER over seeded ClickHouse; Recharts trend + channel breakdown + anomaly. Shopify/revenue-entry → M3. |
| P2.7 | Unified Dashboard + notifications | 🎨 FE | [x] | **Done 2026-07-17.** Unified recommendations queue + TopBar action center. **Real-time WS layer landed 2026-07-23** (Redis pub/sub → Fastify WS → live query-invalidation + toasts). |
| P2.8 | Hardening & polish (no billing) | 🔧 Opt | [x] | **Done 2026-07-17.** Rate limiting + perf batching + workspace settings. PDF/invites deferred. Billing → M5. |

## M3 — V1: Full Channel Coverage  🟨 In progress

Phase folders created (P3.0–P3.5). **First real provider = Google Search Console.** Build order:
P3.0 → non-blocked phases (P3.4 intelligence, GSC-slice of P3.1, P3.5 agency) while Meta/Ads/DataForSEO
approvals mature → then P3.2/P3.3.

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P3.0 | Real platform integrations (OAuth) | [~] | **Built.** Custom OAuth → `platform_connections`; GSC first; encrypted tokens; live sync → ClickHouse; connections UI. 27 API tests. **Live E2E pending user's Google Cloud creds.** Meta/Ads/Shopify adapters + approvals later. |
| P3.1 | SEO module | [~] | **Rank-tracker + organic-traffic slices done 2026-07-18** — GSC-fed keyword positions + per-page traffic from ClickHouse (`apps/api/src/seo.ts`), `/seo` tabs (rankings sparkline + clicks chart). DataForSEO features (research/audit/clustering) gated on paid key. |
| P3.2 | Google Ads module | [~] | **Advisor + RSA + budget planner done 2026-07-18** — `@growthos/logic` google-ads-advisor (wasted-spend, classification, RSA, target-CPA/ROAS, budget allocator; 8 tests) + `/google-ads` page. Live fetch/push + Quality Score gated on the dev token. |
| P3.3 | Meta Ads module | [~] | **Advisor + funnel/copy slice done 2026-07-18** — `@growthos/logic` meta-ads-advisor (funnel split, ad-copy + UGC generators; 4 tests) + `/meta-ads` page; fatigue done in M2. Live sync/publish + CAPI/EMQ gated on App Review. |
| P3.4 | Intelligence Engine V1 | [x] | **V1 done 2026-07-18.** Weekly report + budget-reallocation engine; `intelligence_reports` table; `GET /intelligence/report`; `/intelligence` page. **Real-time WS delivery landed 2026-07-23** (analytics:mer_alert + recommendation:new push live). Scheduled loop + 47-rule set still deferred. |
| P3.5 | Agency features | [x] | **Complete 2026-07-22.** A: collaboration (`recommendation_comments` + `assigned_to`/`due_date`, `/recommendations` queue); B: `audit_logs` + write-hooks + Settings activity; C1: white-label branding (`white_label_config`, agency name/logo/accent on shell); **C2: white-labeled PDF export** (`GET .../reports/weekly.pdf`, react-pdf → streamed download, `/intelligence` Export PDF button — no Puppeteer/R2). 8 API tests + self-audit authz hardening. |

Gate: 500 users / MRR >$50K / agency tier.

## M4 — V2: Automation & Scale  🟨 Started early (non-blocked slices)

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P4.1 | Cross-channel attribution | [~] | **Engine + comparison UI done 2026-07-18** — `@growthos/logic` attribution (last/first-click, linear, time-decay, position-based; 9 tests) over a `conversion_paths` ClickHouse table; `/attribution` model-comparison page. Real paths pending live conversions. |
| P4.2 | AI creative automation | [ ] | Outline — expand to folder when reached. |
| P4.3 | Automated campaign management | [ ] | Outline — expand to folder when reached. |
| P4.4 | GEO tracking + public API | [ ] | Outline — expand to folder when reached. |
| P4.5 | Mobile app | [ ] | Outline — expand to folder when reached. |

Gate: 2,000 users / MRR >$200K.

## M5 — Launch & Monetization  ⬜ Not started (deferred — not launching this season)

Billing pulled out of M2 P2.8 so the basic app is built first. Independent of M3/M4 — pull forward
when a launch is scheduled.

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P5.1 | Billing core | [ ] | `subscriptions` + `usage_records`; Stripe checkout + webhook; trial→paid. |
| P5.2 | Plan limits & metering | [ ] | Metering + `PLAN_LIMIT_REACHED` (402) + upgrade prompts. |
| P5.3 | Customer portal & lifecycle emails | [ ] | Stripe portal; Resend trial/dunning emails. |
| P5.4 | Launch readiness | [ ] | Final hardening, legal/pricing, analytics, go-live checklist. |

## Known blockers

| Blocker | Affects |
|---------|---------|
| ~~Neon connection string~~ | ✅ Resolved 2026-07-05 — connected, P1.1 live. |
| ~~Python 3.12 (current is 3.14)~~ | ✅ Resolved 2026-07-17 — 3.12.10 installed alongside 3.14. |
| ~~Docker not installed (local ClickHouse)~~ | ✅ Resolved 2026-07-17 — WSL2 + Docker Desktop 29.6.1; ClickHouse up. |
| ~~Redis job broker~~ | ✅ Resolved 2026-07-17 — **local Redis via Docker** (`redis://localhost:6379`); Upstash cloud deferred to prod. |

**No open blockers.** M2 P2.1 is fully unblocked.
