# M5 — Progress

Status: [~]  ·  Updated: 2026-07-21

Deferred (rolling-wave) — phases will be expanded to folders when a launch is scheduled.

| Item | Status | Notes |
|------|--------|-------|
| P5.1 Billing core | [x] | `subscriptions` + `usage_records` (0009_billing_core.sql); Stripe checkout + webhook; 14-day Growth trial auto-starts on workspace creation. Settings → Billing section (plan cards, checkout, trial countdown). |
| P5.2 Plan limits & metering | [ ] | Metering + `PLAN_LIMIT_REACHED` (402) + upgrade prompts. Builds on `usage_records` from P5.1. |
| P5.3 Customer portal & lifecycle emails | [ ] | Stripe portal; Resend trial/dunning emails. |
| P5.4 Launch readiness | [ ] | Final hardening, legal/pricing, analytics, go-live checklist. |

## Log

- 2026-07-12 — Milestone created. Holds the billing/launch work moved out of **M2 P2.8** so the basic
  app is built first. Independent of M3/M4; pull forward when launch is scheduled.
- 2026-07-21 — P5.1 shipped. `packages/db/src/schema/billing.ts` (subscriptions + usage_records,
  migration generated via drizzle-kit and verified against a real Postgres instance — all 9
  migrations apply cleanly in order). `apps/api/src/billing.ts` (startTrial, getCurrentSubscription,
  createCheckoutSession, handleWebhookEvent for checkout.session.completed /
  customer.subscription.updated / customer.subscription.deleted) + `routes/billing.ts` (webhook
  route uses an encapsulated Fastify sub-plugin for raw-body signature verification without
  affecting the app's normal JSON parsing elsewhere). `billing.test.ts` — 6/6 passing against a
  real local Postgres (DB-logic and signature-verification paths; `checkout.session.completed`
  isn't covered offline since it calls `stripe.subscriptions.retrieve`). Frontend: `useBilling.ts`
  hook (live/mock) + `BillingSection.tsx` wired into Settings. `PLAN_LIMITS` / `Plan` /
  `Subscription` added to `@growthos/types` as the shared source of truth for P5.2's enforcement.
  Stripe isn't configured in any environment yet — checkout/webhook return `INTEGRATION_NOT_CONNECTED`
  (409) until `STRIPE_SECRET_KEY` etc. are set (see `apps/api/.env.example`), same pattern as the
  other gated integrations.
