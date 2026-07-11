# M2 — Progress

Status: [ ]  ·  Updated: 2026-07-12

Scope: the 5 insight-loop features + unified dashboard, each as a full **vertical slice** (BE + FE),
on **seeded data**. **No billing** (→ M5). **No real OAuth** (→ M3 P3.0).

| Item | Layer | Status | Notes |
|------|-------|--------|-------|
| P2.1 Worker & data plumbing | 🔧 BE | [ ] | Celery worker, Redis job-bridge contract, `background_jobs`, seeded ClickHouse + seeded `platform_connections`. Prereqs: Python 3.12, Docker, Upstash Redis. |
| P2.2 Onboarding Wizard | 🔁 Slice | [ ] | Wizard UI + crawler worker + strategy; 5 seeded recs. |
| P2.3 Paid-to-Organic Bridge | 🔁 Slice | [ ] | Scoring + briefs + Content Pipeline UI. |
| P2.4 Organic-to-Paid Bridge | 🔁 Slice | [ ] | GSC top-pages + Creative Queue UI. |
| P2.5 Creative Fatigue Monitor | 🔁 Slice | [ ] | Fatigue worker + alert-card UI. |
| P2.6 Blended MER Dashboard | 🔁 Slice | [ ] | MER calc + Recharts UI. Shopify pull → M3. |
| P2.7 Unified Dashboard + notifications | 🎨 FE | [ ] | KPI cards + queue + WS notification center. |
| P2.8 Hardening & polish | 🔧 Optional | [ ] | Security + perf + workspace settings + optional PDF. **No billing.** |

## Log

- 2026-07-05 — Plan created.
- 2026-07-12 — **Replanned.** (1) Billing/launch pulled out of P2.8 into the new **M5 — Launch &
  Monetization**; P2.8 is now hardening/polish only. (2) Every feature phase reframed as a full
  BE+FE **vertical slice**. (3) M2 declared **seeded-data**; **real OAuth deferred to M3 (P3.0)**.
  (4) P2.1 job-bridge correctness note added (BullMQ ≠ Celery).
