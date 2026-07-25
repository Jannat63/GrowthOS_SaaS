# P2.8 — Hardening & polish

Milestone: M2 · Depends on: P2.1–P2.7 · Prerequisites: Neon URL · Resend (for invites, optional)

## Goal

Tighten the basic app once the loop works: a security pass, a performance pass, workspace
team-management, and an optional white-label PDF export. **No billing** — Stripe, plan limits, and
monetization are deliberately deferred to **M5 (Launch & Monetization)**, since we are not launching
this season.

> **Optional phase.** This is quality/hardening, not a feature. Do it when the loop (P2.2–P2.7) is
> solid. The security and perf passes are recommended; the PDF export is nice-to-have.

## Subphases

- [ ] **Security pass** — token/secret handling, workspace scoping audit on every data route,
  rate limiting. (Recommended.)
- [ ] **Performance pass** — dashboards render < 2s on seeded data. (Recommended.)
- [ ] **Workspace settings** — invites / roles UI on top of the Better Auth org roles from M1.
- [ ] **White-label PDF export** (Puppeteer). (Optional / nice-to-have.)

## Frontend

- Workspace **Settings** page (members, roles, invites) on shadcn.
- Export affordance on the dashboard (if PDF export is built).

## Deferred to M5 — Launch & Monetization (do NOT build here)

- `subscriptions` + `usage_records` tables.
- Stripe checkout + webhook, trial→paid, customer portal.
- Metering + `PLAN_LIMIT_REACHED` (402) + upgrade prompts.
- Resend trial/billing emails.

## Reuse

- Better Auth organization roles (M1) → workspace settings/invites.

## Verification

- Every data route is workspace-scoped and rate-limited; a cross-workspace request is rejected.
- Dashboards load < 2s on seeded data.
