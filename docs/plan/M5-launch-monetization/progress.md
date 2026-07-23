# M5 — Progress

Status: [x]  ·  Updated: 2026-07-22

Deferred (rolling-wave) — phases will be expanded to folders when a launch is scheduled.

| Item | Status | Notes |
|------|--------|-------|
| P5.1 Billing core | [x] | `subscriptions` + `usage_records` (0009_billing_core.sql); Stripe checkout + webhook; 14-day Growth trial auto-starts on workspace creation. Settings → Billing section (plan cards, checkout, trial countdown). |
| P5.2 Plan limits & metering | [x] | `plan-limits.ts` — `assertWithinLimit`/`recordUsage` (rolling-window counters) + `assertFeatureEnabled` (boolean gates) + `getUsageSummary`. Wired into the one real write endpoint it applies to today (white-label branding); see log for what's framework-ready vs. actually gated. |
| P5.3 Customer portal & lifecycle emails | [x] | Stripe Customer Portal; Resend trial-converted + dunning emails wired to real webhook triggers; trial-ending-soon reminder built but not scheduler-wired (no scheduler exists yet — see log). |
| P5.4 Launch readiness | [x] | Security hardening (helmet, env validation, dependency audit + better-auth CVE fix), `/pricing` `/terms` `/privacy` pages, analytics scaffolding, `GO_LIVE_CHECKLIST.md`. All of M5 is now built — see the checklist for what's still required before actually launching. |

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
- 2026-07-22 — P5.2 shipped, scoped honestly to what the app can actually gate right now.
  `apps/api/src/plan-limits.ts`: `assertWithinLimit`/`recordUsage` for the two rolling-window
  counters in `PLAN_LIMITS` (`recommendationsPerWeek` — resets Monday UTC,
  `aiCreativesPerMonth` — resets the 1st UTC), and `assertFeatureEnabled` for the three boolean
  features (`whiteLabel`, `geoTracking`, `apiAccess`). **Wired into one real endpoint**: white-label
  branding (`PATCH .../branding`) now 402s a starter-plan workspace with `PLAN_LIMIT_REACHED`.
  **Not wired in**: `recommendations_generated` / `ai_creatives_generated` metering has no call
  site yet — both actions are currently produced by idempotent "ensure" helpers
  (`ensureAllRecommendations`) invoked from *read* routes (dashboard load), not from a repeatable
  user-triggered write; gating a read route would 402 people out of their own dashboard once they
  hit the weekly cap. Real per-action generation endpoints land with the scheduled Intelligence
  Engine loop (M3 P3.4 remainder) or AI creative automation (M4 P4.2) — call `assertWithinLimit`
  before / `recordUsage` after at that point. Same status for `trackedKeywords`, `teamMembers`,
  `workspaces` (live counts, not covered by this module) — no write endpoint exists yet (keyword
  tracking, team invites, multi-workspace agency management). `plan-limits.test.ts` — 6/6 passing
  against real Postgres (window increments, limit-reached rejection, Infinity never throws,
  feature gate allow/deny, `getUsageSummary`'s `Infinity → null` JSON-safety conversion). New route
  `GET .../billing/usage` + `useUsage` hook + usage bars/feature list added to `BillingSection.tsx`;
  `BrandingSection.tsx` now surfaces mutation errors (including the new 402) instead of failing
  silently. `CountedMetric` / `BooleanFeature` / `UsageSummary` added to `@growthos/types`.
- 2026-07-22 — P5.3 shipped. `createPortalSession` (billing.ts) + `POST .../billing/portal` route +
  `usePortal` hook + "Manage billing" button in `BillingSection.tsx`. `apps/api/src/emails.ts` —
  Resend-backed `sendTrialEndingSoonEmail` / `sendPaymentFailedEmail` / `sendTrialConvertedEmail`,
  all best-effort (never throw — mirrors Stripe's "gated, never crashes" pattern) plus
  `getWorkspaceOwnerEmail` (billing contact = the org's `owner` role). Receipts intentionally NOT
  reinvented — use Stripe's own Dashboard → Settings → Customer emails toggle instead. **Wired to
  real triggers**: trial-converted fires on `checkout.session.completed`; the dunning email fires
  only on the actual transition *into* `past_due` (checked via Stripe's `event.data
  .previous_attributes`, not on every webhook ping, so it doesn't re-fire on unrelated updates).
  **Not scheduler-wired**: `checkTrialsEndingSoon()` is fully built and tested (new
  `trialReminderSentAt` column, migration `0010_trial_reminder_column.sql`, dedupes so repeat calls
  are harmless) but nothing calls it periodically yet — there's no scheduler in this codebase
  (Celery/Beat deferred per `DECISIONS.md` D2), the same status as the fatigue monitor's scheduled
  alerts. Call it from whatever periodic trigger lands first. Tests: `emails.test.ts` (2/2, pure DB
  logic) + a new `checkTrialsEndingSoon` case in `billing.test.ts` (send-once-then-dedupe) + a
  past_due-transition case that deliberately avoids a live Stripe network call. All passing against
  real Postgres; full suite re-run clean with zero regressions from P5.1/P5.2.
- 2026-07-22 — P5.4 shipped. **Security hardening**: `@fastify/helmet` registered; new
  `apps/api/src/env.ts` fails fast at boot listing every missing required env var at once, warns
  (never throws) about unconfigured optional integrations — 4/4 tests, caught and fixed a real bug
  in its own first pass (Zod's default "Required" message doesn't include the field name). Ran a
  real `pnpm audit --prod`: found `better-auth` pinned at 1.4.21 with several critical/high CVEs
  patched in 1.6.11+ (OAuth refresh-token replay, stored XSS, account takeover). Upgraded to
  1.6.23, hit a real runtime break (`better-call` export mismatch) caused by a stale
  `@better-auth/cli` devDependency pulling in a conflicting transitive version — removed it (unused
  by any script), then verified the fix with a **live signup → session → workspace-creation flow**
  against real Postgres before trusting it, followed by a full test-suite re-run (49 passed, same 6
  pre-existing infra-only failures as every prior run, zero regressions). Also caught and fixed a
  second self-authored bug: `env.ts`'s first draft warned about `GOOGLE_ADS_DEVELOPER_TOKEN` /
  `META_APP_ID` / `DATAFORSEO_LOGIN` — env vars that don't exist anywhere in the actual codebase.
  Removed them from the runtime check; the real status of those integrations lives in
  `GO_LIVE_CHECKLIST.md` §2 instead. **Legal/pricing pages**: `/pricing` (full comparison table),
  `/terms`, `/privacy` — clearly marked draft/not-legal-advice with bracketed placeholders for real
  business details. Along the way, caught a real pre-existing product bug: the landing page's
  `PricingTeaser` showed placeholder figures ($0/$99/Custom, "Agency" tier) that contradicted the
  PRD's authoritative pricing ($79/$199/$399 Starter/Growth/Scale) already live in Stripe /
  `PLAN_LIMITS` / `BillingSection` — fixed it to read from `PLAN_LIMITS` directly so it can't drift
  again. Also fixed the footer's entirely-dead `href="#"` links (Pricing/Privacy/Terms now point
  somewhere real) and the header's `#pricing` anchor (now links to the full `/pricing` page).
  **Analytics**: `apps/web/lib/analytics.ts` — PostHog (my pick; no provider was specified anywhere
  in the blueprint), safe no-op without `NEXT_PUBLIC_POSTHOG_KEY`. Three real events wired:
  `account_created` (sign-up), `workspace_created` (create-workspace), `checkout_started` /
  `checkout_completed` (the latter via the `?checkout=success` Stripe return-URL param, the only
  reliable client-side signal since the actual plan sync happens server-side via webhook).
  **Go-live checklist**: `GO_LIVE_CHECKLIST.md` — the complete, honest list of what's actually
  required before this launches, grounded in what's verified rather than assumed (e.g. confirmed
  by grep that Google Ads/Meta/DataForSEO have no credential-gated code path at all yet, unlike
  Stripe/Resend). Verified everything in this phase with a **real Next.js production build** (all
  27 routes compiled and prerendered), not just typecheck — temporarily bypassed the sandbox's
  Google Fonts network restriction to run it, then restored `layout.tsx` exactly. All of M5 is now
  built. M5 P5.1–P5.4 complete.
