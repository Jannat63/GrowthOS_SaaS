# GrowthOS — Master Progress Dashboard

> **Where we are: M4 — V2: Automation & Scale · P4.3 Automated Campaign Management.**
> P4.3a (the control plane) is done; P4.3b (live Google Ads / Meta adapters) is blocked on external
> credentials. Everything else still open in M3/M4 is likewise externally gated — the un-gated
> backlog is in `docs/AUDIT-2026-08-13-codebase.md`.

Overall status: **🟨 In progress** — M0 done; **M1 COMPLETE**; **M2 COMPLETE** (seeded Insight Loop MVP,
P2.1–P2.8); **M3 IN PROGRESS** — every channel module now has a live UI (P3.0 OAuth built, live pending
Google creds; P3.1 SEO, P3.2 Google Ads, P3.3 Meta advisors, P3.4 Intelligence V1, P3.5 agency ALL
done — remaining M3 work is external-gated). **M4 started early and is where work is now** — P4.1
cross-channel attribution, the Intelligence Engine rule-set expansion (5→19 rules across all 6
bridges), a lightweight scheduler (`node-cron`, wires trial reminders + the intelligence tick +
a stuck-job sweep), P4.4's public API (Bearer-key authenticated, OpenAPI docs), real-time WebSocket
transport (resolves a deferral independently named in P2.5/P2.6/P2.7/P3.4 — see P2.7's progress.md),
and **P4.3a's automation control plane** are all done.
**M5 COMPLETE** — P5.1 Billing core, P5.2 Plan limits & metering, P5.3 Customer portal &
lifecycle emails, and P5.4 Launch readiness all done. See
docs/plan/M5-launch-monetization/GO_LIVE_CHECKLIST.md for what's still required before actually
launching (live credentials, legal review — none of that is code work). The checklist's "scheduler
infra" item is resolved: `node-cron` runs in-process in `apps/api`, no separate deployable.
M2 replanned 2026-07-12: seeded-data vertical slices, **no billing** (→ new **M5**), **real OAuth → M3 P3.0**.

**2026-08-13 — `main` merged into `shihab-restructure`.** Conflicts were resolved by taking main's
side throughout, which kept main's implementation of every overlapping subsystem (WebSockets, PDF
export, scheduler) and disconnected this branch's. One feature — the autonomous scheduled
intelligence loop — was dropped entirely and has been restored; four orphaned duplicate
implementations were deleted, and several defects found in the merged code were fixed. Full list,
including what was deliberately deferred: **`docs/AUDIT-2026-08-13-post-merge.md`**.

**2026-08-13 — whole-codebase audit**, separate from the merge damage: 14 findings, 10 fixed. The
four still open are tracked in **`docs/AUDIT-2026-08-13-codebase.md`** — API test-suite reliability
(#9, blocked on a pnpm/`drizzle-orm` duplication, not on the database), the rest of monitoring (#10,
`/health/ready` exists but nothing polls it and there's no Sentry), `README.md` (#13), and seeded
data being presented as real throughout the UI (#14, a product decision). Those four are the real
un-gated backlog — most of what's left in M3/M4 needs external credentials.
·  Updated: 2026-08-13

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
| P2.7 | Unified Dashboard + notifications | 🎨 FE | [x] | **Done 2026-07-17.** Unified recommendations queue + TopBar action center. Real-time WS → M3. |
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
| P3.4 | Intelligence Engine V1 | [x] | **V1 done 2026-07-18.** Weekly report + budget-reallocation engine; `intelligence_reports` table; `GET /intelligence/report`; `/intelligence` page. **Real-time WS delivery + the autonomous scheduled loop are both live** — the loop landed 2026-07-23, was dropped by the 2026-08-13 main merge, and was restored 2026-08-13 (see `docs/AUDIT-2026-08-13-post-merge.md`): Redis-lock single-runner, per-workspace cadence/enable (`automation_config`), persistent-dedupe alerting (`automation_alerts` → mer/fatigue re-fire only on change), observability (`scheduler_runs` + Settings activity), `intelligence:report_ready` WS event. |
| P3.5 | Agency features | [x] | **All slices done** (C2 completed 2026-07-25) — A: collaboration (`recommendation_comments` + `assigned_to`/`due_date`, `/recommendations` queue); B: `audit_logs` + write-hooks + Settings activity; C1: white-label branding (`white_label_config`, agency name/logo/accent on shell); C2: white-labeled PDF export (Puppeteer, renders the same `WeeklyReport` the Intelligence page shows, streamed on demand — no R2 upload, see P3.5 progress.md for why). 5 API tests + self-audit authz hardening + 6 more for the PDF template. |

Gate: 500 users / MRR >$50K / agency tier.

## M4 — V2: Automation & Scale  🟨 Started early (non-blocked slices)

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P4.1 | Cross-channel attribution | [~] | **Engine + comparison UI done 2026-07-18** — `@growthos/logic` attribution (last/first-click, linear, time-decay, position-based; 9 tests) over a `conversion_paths` ClickHouse table; `/attribution` model-comparison page. Real paths pending live conversions. |
| — | Intelligence Engine rule-set expansion | [x] | **Done 2026-07-26** — `cross-channel-engine.ts` rewritten as a rule registry, 5→19 rules (20 recommendation outputs) across all 6 channel-pair bridges (added `GoogleAds→Meta`, `Meta→GoogleAds`, plus a blended-MER cross-cutting rule). 37 tests. Not a numbered blueprint phase — see `docs/plan/M4-v2-automation/progress.md` for why "47" was never a real spec. |
| — | Scheduler | [x] | **Done 2026-07-26, consolidated 2026-08-13** — `apps/api/src/scheduler.ts`, lightweight `node-cron` in-process (Celery/Beat stays deferred per D2). Two locked tasks: `checkTrialsEndingSoon` (daily, claim-before-send) + the autonomous intelligence tick (hourly, `scheduler/`). The merge briefly left two rival schedulers; the unguarded 4h refresh + re-firing MER anomaly check were folded into the deduped tick — see `docs/AUDIT-2026-08-13-post-merge.md` #1/#8/#10. Deliberately does NOT wire `ensureFatigueAlerts` — see progress.md for why re-running that specific function is a guaranteed no-op today. |
| — | Real-time WebSocket transport | [x] | **Done 2026-07-27** — resolves a deferral independently named across P2.5/P2.6/P2.7/P3.4. `ws.ts` (in-process rooms + Redis relay) + `routes/ws.ts` (cookie-session auth via `preHandler`, before the upgrade completes) + a real Python-worker→Redis→API relay for `job:complete`/`job:failed`. All 5 named events wired to real trigger points. 9 tests (6 pure logic + 3 real server/real `ws` client). Caught and fixed a real hang-forever bug in `publish()` when Redis is down. Full writeup in P2.7's progress.md. |
| P4.4 | Public API (buildable half) | [~] | **Done 2026-07-26** — `api_keys` table (SHA-256 hash only), Bearer-authenticated `/api/public/v1/*` routes, OpenAPI spec + docs UI via `@fastify/swagger`, Settings → API Keys UI. Verified with a real signup→upgrade→create-key→call-public-API→revoke run. GEO/AI-citation tracking (this phase's other half) still needs external access this codebase doesn't have. 15 tests. |
| P4.2 | AI creative automation | [ ] | **Folder + plan written 2026-08-20** — `M4-v2-automation/P4.2-ai-creative/`. Split at the credential line: **P4.2a buildable now** (brand-guidelines system, creative scorecard, variant-experiment structure, `ai_creatives_generated` metering — which closes the last open M5 P5.2 item); **P4.2b deferred** (15–25 image variants/week + video storyboards need a paid generation API, D4). The roadmap's "performance prediction" bullet was deliberately rescoped to a scorecard over creatives that have *actually run* — honest prediction needs a trained model this codebase has neither the data nor the credential for, and a confident-looking fake number is audit #14 again. |
| P4.3 | Automated campaign management | [~] | **← current phase. P4.3a done 2026-08-13.** Backbone (autonomous scheduler, Redis-lock single-runner, per-workspace cadence, persistent-dedupe alerting, `scheduler_runs`) landed 2026-07-23 and was restored after the merge. On top of it, the **control plane**: `automation_rules` + `automation_actions`, a pure planner in `@growthos/logic`, an executor enforcing caps + reversibility, dry-run and real `content-queue` adapters, 6 routes, and the `/automation` approval queue. 32 tests. **P4.3b — live Google Ads / Meta adapters — blocked** on a developer token + App Review (and on having ad-account data to test against). See `M4-v2-automation/P4.3-automated-campaigns/`. |
| P4.4 | GEO tracking + public API | [~] | **Folder + plan written 2026-08-20** — `M4-v2-automation/P4.4-geo-public-api/` (this row and the "Public API (buildable half)" row above are the same phase; the folder now consolidates both). Public API + OpenAPI **done**. **Planned, un-gated:** per-key rate limits (scoped limiter keyed by API-key id, per-plan ceilings, Redis-backed, `RateLimit-*` + `Retry-After` headers) and **outbound webhooks** (Standard Webhooks signing, `webhook_endpoints`/`webhook_deliveries`, fan-out from the existing `publish()` bus, scheduler-driven delivery with jittered backoff). **P4.4b GEO/AI-citation tracking deferred** on paid ChatGPT/Perplexity/Gemini access. |
| P4.5 | Mobile app | [ ] | Outline — expand to folder when reached. |

Gate: 2,000 users / MRR >$200K.

## M5 — Launch & Monetization  🟩 COMPLETE — P5.1, P5.2, P5.3, P5.4 all done (see docs/plan/M5-launch-monetization/progress.md and GO_LIVE_CHECKLIST.md)

Billing pulled out of M2 P2.8 so the basic app is built first. Independent of M3/M4 — pull forward
when a launch is scheduled.

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P5.1 | Billing core | [x] | **Done 2026-07-21.** `subscriptions` + `usage_records` (0009); Stripe checkout + webhook; 14-day Growth trial auto-starts on workspace creation; Settings → Billing. |
| P5.2 | Plan limits & metering | [x] | **Done 2026-07-22.** `plan-limits.ts` — rolling-window counters, boolean feature gates, `getUsageSummary`. Call sites wired 2026-08-13: recommendation generation now meters (the onboarding batch deliberately unmetered — see `AUDIT-2026-08-13-codebase.md`), and workspace creation enforces the per-plan cap. |
| P5.3 | Customer portal & lifecycle emails | [x] | **Done 2026-07-22.** Stripe Customer Portal; Resend trial-converted + dunning emails on real webhook triggers. `checkTrialsEndingSoon` is now scheduler-wired (daily @ 09:00 UTC, under a Redis lock) — it wasn't when this phase shipped, because no scheduler existed yet. |
| P5.4 | Launch readiness | [x] | **Done 2026-07-22.** helmet + boot-time env validation (extended 2026-08-13 to require the OAuth secrets), dependency audit + a real better-auth CVE fix, `/pricing` `/terms` `/privacy`, PostHog analytics, `GO_LIVE_CHECKLIST.md`. |

## Known blockers

| Blocker | Affects |
|---------|---------|
| ~~Neon connection string~~ | ✅ Resolved 2026-07-05 — connected, P1.1 live. |
| ~~Python 3.12 (current is 3.14)~~ | ✅ Resolved 2026-07-17 — 3.12.10 installed alongside 3.14. |
| ~~Docker not installed (local ClickHouse)~~ | ✅ Resolved 2026-07-17 — WSL2 + Docker Desktop 29.6.1; ClickHouse up. |
| ~~Redis job broker~~ | ✅ Resolved 2026-07-17 — **local Redis via Docker** (`redis://localhost:6379`); Upstash cloud deferred to prod. |

**No open blockers.** M2 P2.1 is fully unblocked.
