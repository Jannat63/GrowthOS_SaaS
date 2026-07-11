# P2.8 — Billing, plan limits, launch readiness

Milestone: M2 · Depends on: P2.1–P2.7 · Prerequisites: Neon URL · Stripe · Resend

## Goal

Make the product launch-ready: Stripe billing with plan limits, a white-label PDF report, and passes
on security and performance.

## Subphases

- [ ] Add the `subscriptions` and `usage_records` tables.
- [ ] Add Stripe checkout + webhook (reuse `legacy/services/auth-service/billing.py` as spec) with
  trial → paid.
- [ ] Add metering + `PLAN_LIMIT_REACHED` (HTTP 402) + upgrade prompts.
- [ ] Add the white-label PDF export (Puppeteer).
- [ ] Do the security pass: token encryption, workspace scoping, rate limiting.
- [ ] Do the performance pass: dashboards < 2s.
- [ ] Add Resend trial emails.
- [ ] Add workspace settings (invites / roles).
- [ ] Add the Stripe customer portal.

## Reuse

- `legacy/services/auth-service/billing.py` → spec (Stripe checkout + webhook).

## Surface

- Tables: `subscriptions`, `usage_records`.
- Stripe: checkout + webhook, trial→paid, customer portal.
- Metering: `PLAN_LIMIT_REACHED` (402) + upgrade prompts.
- White-label PDF (Puppeteer).
- Security: token encryption, workspace scoping, rate limiting.
- Perf: dashboards < 2s.
- Resend trial emails; workspace settings (invites/roles).

## Verification

- A test-mode checkout completes.
- Hitting a plan limit returns a 402 + an upgrade prompt.
