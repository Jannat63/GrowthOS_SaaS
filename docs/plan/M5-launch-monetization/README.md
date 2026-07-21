# M5 — Launch & Monetization

Status: ⬜ Not started  *(deferred — we are not launching this season)*

> **Sequenced flexibly.** This milestone is parked until a launch date is set. It is numbered M5 to
> keep it out of the way, but it is **independent of M3/M4 feature depth** and can be pulled forward
> whenever monetization is needed — it only depends on M2 (a working basic app). Nothing in M2/M3/M4
> should assume billing exists.

## Goal

Make GrowthOS chargeable and launch-ready: Stripe billing with plan limits, the customer portal,
and the trial→paid lifecycle. This is the content that was originally scoped inside M2 P2.8 and moved
out so the team can build the whole basic application first.

## Phase outline

| Phase | Summary | Status |
|-------|---------|--------|
| P5.1 | **Billing core** — `subscriptions` + `usage_records` tables; Stripe checkout + webhook; trial→paid lifecycle (reuse `legacy/services/auth-service/billing.py` as spec). | [ ] |
| P5.2 | **Plan limits & metering** — usage metering, `PLAN_LIMIT_REACHED` (HTTP 402) enforcement, in-app upgrade prompts. | [ ] |
| P5.3 | **Customer portal & lifecycle emails** — Stripe customer portal; Resend trial / dunning / receipt emails. | [ ] |
| P5.4 | **Launch readiness** — final security + perf hardening beyond M2, legal/pricing pages, analytics, go-live checklist. | [ ] |

## Reuse

- `legacy/services/auth-service/billing.py` → spec (Stripe checkout + webhook).

## Prerequisites

- A working basic app (M2 complete).
- Stripe account; Resend account.

## Gate

Whenever a public launch / paid rollout is scheduled.
