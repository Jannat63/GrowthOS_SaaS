# M2 — MVP: The Insight Loop

Status: ⬜ Not started  *(the 5 features + dashboard + billing)*

## Goal

Prove the cross-channel insight loop end-to-end and reach launch readiness — a user can onboard, see
cross-channel recommendations, view the MER dashboard, and subscribe.

## Phases

| Phase | Summary | Status |
|-------|---------|--------|
| [P2.1 Worker & data plumbing](./P2.1-worker-data-plumbing/plan.md) | `apps/worker` (Celery + Redis), the enqueue→process→status job pattern, `background_jobs`, local ClickHouse, OAuth `platform_connections`. | [ ] |
| [P2.2 Onboarding Wizard](./P2.2-onboarding-wizard/plan.md) | 7-step wizard, site-crawler worker, channel-mix + 90-day strategy, pixel/tag validators, land on dashboard with 5 seeded recs. | [ ] |
| [P2.3 Paid-to-Organic Bridge](./P2.3-paid-to-organic/plan.md) | Search-terms scoring, content-brief generator, Content Pipeline UI, recommendation act/dismiss/snooze. | [ ] |
| [P2.4 Organic-to-Paid Bridge](./P2.4-organic-to-paid/plan.md) | GSC top-pages worker, Meta creative-brief generator, Creative Queue UI, CTR>3% reverse loop. | [ ] |
| [P2.5 Creative Fatigue Monitor](./P2.5-creative-fatigue/plan.md) | `meta_ad_sets`, 4-hourly fatigue worker, alert + email + WebSocket, alert-card UI. | [ ] |
| [P2.6 Blended MER Dashboard](./P2.6-blended-mer/plan.md) | Revenue entry + Shopify pull, MER calc, `GET /analytics/mer`, Recharts trend, anomaly alert. | [ ] |
| [P2.7 Unified Dashboard + notifications](./P2.7-unified-dashboard/plan.md) | Growth-hub KPI cards, impact-sorted recommendation queue, WebSocket notification center. | [ ] |
| [P2.8 Billing, plan limits, launch readiness](./P2.8-billing-launch/plan.md) | Stripe checkout + webhook, metering + `PLAN_LIMIT_REACHED`, white-label PDF, security + perf pass. | [ ] |

## Status notes

- All phases `[ ]` (not started).
- **P2.1 has extra prerequisites**: Python 3.12 (current is 3.14 — install 3.12); Docker (not
  installed — needed for local ClickHouse); an Upstash Redis account (the job broker). Most of M2
  also depends on the Neon connection string.

## Exit criteria

- A user onboards → sees cross-channel recs → MER dashboard → can subscribe.
- The 5 acceptance flows pass.
