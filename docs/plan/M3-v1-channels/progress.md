# M3 — Progress

Status: [~]  ·  Updated: 2026-07-22  ·  **In progress** — P3.0 built (live pending Google creds); P3.4 V1 done; **P3.5 complete (A+B+C1+C2)**; P3.1 SEO (2 slices) done; P3.2 + P3.3 advisor slices done. Every module now has a live surface. Remaining M3 work is external-gated (OAuth creds, dev token, App Review, paid keys).

Phases expanded to folders (`P3.0-real-integrations/` … `P3.5-agency/`). First real provider = **Google
Search Console**. Build order: P3.0 → then the non-blocked phases (P3.4, GSC-slice of P3.1, P3.5) while
Meta/Ads/DataForSEO approvals mature → then P3.2/P3.3.

| Item | Status | Notes |
|------|--------|-------|
| P3.0 Real platform integrations (OAuth) | [~] | **Built.** Custom OAuth → `platform_connections`; GSC first; live sync → ClickHouse. Live E2E pending Google creds. |
| P3.1 SEO module | [~] | **Rank-tracker + organic-traffic slices done** — GSC-fed keyword positions + per-page traffic from ClickHouse, `/seo` tabs. DataForSEO features (research/audit/clustering) still gated (paid). |
| P3.2 Google Ads module | [~] | **Advisor + RSA + budget/target planner done** — deterministic campaign advisor, wasted-spend, RSA generator, unit-economics planner (`/google-ads`). Live fetch/push + Quality Score gated on the dev token. |
| P3.3 Meta Ads module | [~] | **Advisor + funnel/copy slice done** — campaign advisor + full-funnel planner + ad-copy/UGC studio (`/meta-ads`); fatigue done in M2. Live sync/publish + CAPI/EMQ gated on App Review. |
| P3.4 Intelligence Engine V1 | [x] | **V1 done** — weekly report + budget engine + `/intelligence` page. Scheduled loop + WS + 47-rule set deferred. |
| P3.5 Agency features | [x] | **Complete** — collaboration + audit log + white-label branding + white-labeled PDF export (C2 via react-pdf, streamed; no Puppeteer/R2). |

## Log

- 2026-07-23 — **Autonomous scheduled intelligence & automation loop** (M4 P4.3 backbone; closes the
  P3.4 scheduled-loop deferral). API-side scheduler started from `index.ts` (never `buildApp`),
  Redis-lock single-runner, per-workspace cadence + enable (`automation_config`). Each tick refreshes
  stale reports via the TS `getWeeklyReport` engine and pushes `report:ready`; a persistent
  `automation_alerts` signature makes `analytics:mer_alert`/`meta:fatigue_alert` re-fire only on
  change (replaced the per-process dedupe). Observability via `scheduler_runs` + a Settings activity
  table + `GET .../scheduler/runs`. Verified live: a 0-cadence tick refreshed 9 workspaces / 18 new
  alerts, the second tick 9 / 0 alerts. Migrations 0009+0010. 17 API scheduler tests.
- 2026-07-23 — **Real-time WebSocket layer** (cross-cutting; closes the WS deferrals in M2 P2.7
  and M3 P3.4). Redis pub/sub bus (`ws:events`) bridges the Python worker + Fastify API; a
  raw `@fastify/websocket` endpoint (`GET /api/v1/ws`, Better-Auth-cookie auth + per-workspace
  rooms) fans events out; the web `useRealtime` hook turns them into live TanStack-Query
  invalidations + toasts. All four event types wired end-to-end (`job:complete`,
  `recommendation:new`, `meta:fatigue_alert`, `analytics:mer_alert`). Additive — polling stays
  as the fallback. Spec: `docs/superpowers/specs/2026-07-23-realtime-websocket-layer-design.md`.
  Tests: API 8 (rooms + publish), web 4 (event→invalidation map), worker 2 (publish_event).
- 2026-07-05 — Plan created.
- 2026-07-12 — Added **P3.0 Real platform integrations (OAuth)** — the real-OAuth work deferred out of
  M2 (which runs on seeded data).
- 2026-07-17 — **M3 started.** Expanded P3.0–P3.5 into phase folders (plan + progress each). Decided:
  Google Search Console first; custom OAuth into `platform_connections` (not Better Auth); API-side live
  sync into ClickHouse. **P3.0 build in progress.**
- 2026-07-18 — **P3.0 build complete** (framework + Google adapter + GSC sync + connections UI; 27 API
  tests; live E2E blocked on user's Google Cloud creds). **P3.4 Intelligence Engine V1 done** — weekly
  report + budget-reallocation engine, `intelligence_reports` table, API route, `/intelligence` page.
  Scheduled loop / WebSocket / full 47-rule set deferred (documented in P3.4). **P3.5 Slices A+B+C1 done** —
  recommendation collaboration (comments + assignment, `/recommendations` queue), audit log (Settings
  activity), and white-label branding (agency name/logo/accent on the shell). Self-audit hardened the
  audit-log authz + assignee validation. Only P3.5 C2 (white-labeled PDF export, needs Puppeteer+R2) left.
- 2026-07-18 — **P3.1 rank-tracker slice** — GSC-fed keyword rank tracking (`apps/api/src/seo.ts` over
  ClickHouse `keyword_rankings`, seeded until live GSC), `/seo` page, SEO nav live. DataForSEO features
  (keyword research, site audit, clustering) still gated on the paid key.
- 2026-07-18 — **P3.1 organic-traffic slice** — per-page clicks/impressions/CTR/position + daily trend
  from ClickHouse `organic_traffic`; `/seo` split into Rank tracker / Organic traffic tabs.
- 2026-07-18 — **P3.2 advisor slice** — `@growthos/logic` google-ads-advisor engine (wasted-spend,
  campaign classification, RSA generator, target-CPA/ROAS + budget allocator; 8 tests) + `/google-ads`
  page. Live campaign fetch/push gated on the Google Ads developer token.
- 2026-07-18 — **P3.3 advisor slice** — `@growthos/logic` meta-ads-advisor engine (full-funnel split,
  ad-copy + UGC generators; 4 tests) + `/meta-ads` page (shared CampaignInsightsPanel + funnel/copy
  tools). Live sync/publish + CAPI/EMQ gated on Meta App Review. Every channel module now has a live UI.
- 2026-07-22 — **P3.5 C2 (white-labeled PDF export)** — `renderWeeklyReportPdf` (react-pdf, no headless
  browser) + `GET .../reports/weekly.pdf` streamed download + `/intelligence` Export PDF button. Chose
  react-pdf over Puppeteer and direct-stream over R2 (no external infra). **P3.5 now complete.**
