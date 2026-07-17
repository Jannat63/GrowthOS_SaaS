# M2 — Progress

Status: [~]  ·  Updated: 2026-07-17

Scope: the 5 insight-loop features + unified dashboard, each as a full **vertical slice** (BE + FE),
on **seeded data**. **No billing** (→ M5). **No real OAuth** (→ M3 P3.0).

| Item | Layer | Status | Notes |
|------|-------|--------|-------|
| P2.1 Worker & data plumbing | 🔧 BE | [x] | **Done 2026-07-17.** Plain Python worker (not Celery), Redis job-bridge (JSON envelope on `jobs:queue`), `background_jobs`, seeded ClickHouse (60 rows) + stub `platform_connections`. E2E verified. Local Redis/ClickHouse via Docker. |
| P2.2 Onboarding Wizard | 🔁 Slice | [x] | **Done 2026-07-17 (Option B).** Wizard wired to real pipeline (persist profile → onboarding_analyze job: stub crawl → strategy → review → complete gate). Recs deferred to P2.3. |
| P2.3 Paid-to-Organic Bridge | 🔁 Slice | [x] | **Done 2026-07-17.** P2.3a (shared `@growthos/logic`, `recommendations`, live queue) + P2.3b (search-terms surface, content briefs, Content Pipeline page, act/dismiss/snooze). |
| P2.4 Organic-to-Paid Bridge | 🔁 Slice | [x] | **Done 2026-07-17.** Meta creative-brief generator; `GET /seo/top-pages` → `organic_to_paid` recs + creative briefs; Creative Queue page w/ act/dismiss/snooze. |
| P2.5 Creative Fatigue Monitor | 🔁 Slice | [x] | **Done 2026-07-17.** `GET /meta-ads/fatigue` → `fatigue_alert` recs; Fatigue Monitor page w/ refresh/snooze/ignore. Scheduled worker/email/WS deferred (M3/M5/P2.7). |
| P2.6 Blended MER Dashboard | 🔁 Slice | [ ] | MER calc + Recharts UI. Shopify pull → M3. |
| P2.7 Unified Dashboard + notifications | 🎨 FE | [ ] | KPI cards + queue + WS notification center. |
| P2.8 Hardening & polish | 🔧 Optional | [ ] | Security + perf + workspace settings + optional PDF. **No billing.** |

## Log

- 2026-07-05 — Plan created.
- 2026-07-12 — **Replanned.** (1) Billing/launch pulled out of P2.8 into the new **M5 — Launch &
  Monetization**; P2.8 is now hardening/polish only. (2) Every feature phase reframed as a full
  BE+FE **vertical slice**. (3) M2 declared **seeded-data**; **real OAuth deferred to M3 (P3.0)**.
  (4) P2.1 job-bridge correctness note added (BullMQ ≠ Celery).
- 2026-07-17 — **P2.1 complete** (plain worker + job bridge + seeds; E2E verified). M2 now in progress.
- 2026-07-17 — **P2.2 complete** (onboarding pipeline, Option B — recs deferred to P2.3).
- 2026-07-17 — **P2.3a complete** (recommendations foundation: shared `@growthos/logic`,
  `recommendations` table, live `GET /recommendations`, frontend unification).
- 2026-07-17 — **P2.3 complete** (P2.3b: paid-to-organic feature — search-terms surface, content briefs,
  Content Pipeline page, act/dismiss/snooze).
- 2026-07-17 — **P2.4 complete** (organic-to-paid: top-pages surface, Meta creative briefs, Creative
  Queue page, act/dismiss/snooze).
- 2026-07-17 — **P2.5 complete** (creative fatigue: fatigue surface, alert recs, Fatigue Monitor page).
  Scheduled worker/email/WS deferred (M3/M5/P2.7). Next: **P2.6 Blended MER Dashboard**.
