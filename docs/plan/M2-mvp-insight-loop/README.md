# M2 — MVP: The Insight Loop

Status: ⬜ Not started  *(the 5 loop features + unified dashboard + hardening — **no billing**)*

## Goal

Build the whole basic application: prove the cross-channel insight loop end-to-end — a user onboards,
sees cross-channel recommendations, acts on them, and views the MER dashboard. Every feature phase is
a **full vertical slice** (worker + API + its UI module), not backend-only.

## Ground rules for M2

- **Seeded data, not live.** M2 runs on **seeded fixtures** (`lib/mock-data` + the tested `lib/logic`
  engines). Real platform OAuth (Google / Meta / GSC / Shopify) is **deferred to M3 (P3.0)** so nothing
  here blocks on external app-review timelines.
- **No billing.** Stripe, plan limits, and monetization are deferred to **M5 — Launch & Monetization**
  (we're not launching this season). P2.8 keeps only hardening/polish.
- **Frontend in every phase.** Each phase ends with something visible and usable on the shadcn stack.

## Phases

| Phase | Summary | Layer | Status |
|-------|---------|-------|--------|
| [P2.1 Worker & data plumbing](./P2.1-worker-data-plumbing/plan.md) | `apps/worker` (Celery + Redis), the enqueue→process→status job pattern (explicit Redis job-bridge contract), `background_jobs`, local **seeded** ClickHouse, **seeded** `platform_connections`. | 🔧 BE | [ ] |
| [P2.2 Onboarding Wizard](./P2.2-onboarding-wizard/plan.md) | 7-step wizard **UI** + site-crawler worker + channel-mix/90-day strategy; lands on dashboard with 5 seeded recs. | 🔁 Slice | [ ] |
| [P2.3 Paid-to-Organic Bridge](./P2.3-paid-to-organic/plan.md) | Search-terms scoring + content-brief generator + **Content Pipeline UI** + rec act/dismiss/snooze. | 🔁 Slice | [ ] |
| [P2.4 Organic-to-Paid Bridge](./P2.4-organic-to-paid/plan.md) | GSC top-pages worker + Meta creative-brief generator + **Creative Queue UI** + CTR>3% reverse loop. | 🔁 Slice | [ ] |
| [P2.5 Creative Fatigue Monitor](./P2.5-creative-fatigue/plan.md) | `meta_ad_sets`, 4-hourly fatigue worker, alert + email + WebSocket, **alert-card UI**. | 🔁 Slice | [ ] |
| [P2.6 Blended MER Dashboard](./P2.6-blended-mer/plan.md) | Revenue entry, MER calc, `GET /analytics/mer`, **Recharts trend UI**, anomaly alert. (Shopify pull → M3.) | 🔁 Slice | [ ] |
| [P2.7 Unified Dashboard + notifications](./P2.7-unified-dashboard/plan.md) | Growth-hub KPI cards, impact-sorted recommendation queue, WebSocket notification center. | 🎨 FE | [ ] |
| [P2.8 Hardening & polish](./P2.8-hardening-polish/plan.md) | Security + perf pass, workspace settings (invites/roles), optional white-label PDF. **No billing.** | 🔧 Optional | [ ] |

**Critical path** (parallelism, not a straight line):
`P2.1 → P2.2 → { P2.3, P2.4, P2.5, P2.6 in parallel } → P2.7 → P2.8`.
P2.5 and P2.6 only depend on P2.1; the two bridges are independent — they can run alongside each other.

## Status notes

- All phases `[ ]` (not started).
- **P2.1 prerequisites**: Python 3.12 (current is 3.14 — install 3.12); Docker (not installed — needed
  for local ClickHouse); an Upstash Redis account (the job broker).
- **BullMQ ≠ Celery**: the P2.1 job pattern must use an explicit shared Redis contract, not a
  "BullMQ → Celery" bridge (they are not wire-compatible). See P2.1.

## Exit criteria

- A user onboards → sees cross-channel recs → acts on them → views the MER dashboard, **all on seeded
  data**, each module fully rendered in the UI.
- The loop acceptance flows pass.
- (Real OAuth and billing are explicitly **out of scope** — M3 / M5.)
