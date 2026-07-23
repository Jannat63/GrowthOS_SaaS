# Go-Live Checklist

Status: living document — updated as gated items get resolved. Last updated: 2026-07-22.

This is the honest list of everything standing between "the code is built" and "this is safe to
put in front of paying customers." Items are grouped by what actually blocks launch vs. what's
recommended hardening. Nothing here is assumed done — each item names the file/env var to check
and how to verify it, not just a checkbox to tick.

## 1. Billing (M5 P5.1–P5.3) — blocks launch

- [ ] **Stripe live keys.** Create a live-mode Stripe account, set `STRIPE_SECRET_KEY` in
      production. Test-mode checkout (`sk_test_...`) works today; nothing charges real money until
      this is a live key.
- [ ] **Stripe Products + Prices.** Create 3 Products with recurring Prices matching
      `docs/blueprint/PRD.md` §7 (Starter $79/mo, Growth $199/mo, Scale $399/mo — the same figures
      `packages/types` `PLAN_LIMITS` and the `/pricing` page use). Set `STRIPE_PRICE_STARTER`,
      `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE`.
- [ ] **Stripe webhook endpoint.** Point a live webhook at `<api origin>/api/v1/billing/webhook`,
      subscribed to at least `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted`. Set `STRIPE_WEBHOOK_SECRET` from that endpoint, not the CLI
      test secret.
- [ ] **Stripe's own receipt emails.** Turn on Dashboard → Settings → Customer emails. This app
      deliberately does not send its own payment receipts (see `apps/api/src/emails.ts`).
- [ ] **Resend domain verification.** Verify your sending domain in Resend, set `RESEND_API_KEY`
      and `RESEND_FROM_EMAIL` to a verified address — unverified domains get emails spam-filtered
      or bounced.
- [ ] **Trial-ending-soon reminders need a scheduler.** `checkTrialsEndingSoon()` in `billing.ts`
      is built and tested but nothing calls it periodically — there's no scheduler in this codebase
      yet (Celery/Beat deferred per `docs/blueprint/DECISIONS.md` D2). Without this, trial users
      get no reminder email before their trial ends. Wire it to whatever scheduling mechanism
      lands first (see §5).
- [ ] **Plan-limit enforcement is partial by design, not oversight.** Only white-label branding is
      actually gated by `assertFeatureEnabled` today. `recommendations_generated` /
      `ai_creatives_generated` metering has no real call site yet — see
      `docs/plan/M5-launch-monetization/progress.md` (P5.2 log entry) for exactly why and what
      unblocks it. This means Starter-plan customers currently get unlimited recommendations in
      practice, not the 5/week the pricing page promises. Decide whether that's acceptable for
      launch or whether it blocks it.

## 2. Real third-party integrations — blocks the features that depend on them

These aren't gated by an env var the way Stripe/Resend are — the advisors simply always run on
seeded/mock data because no live-fetch code path exists yet for them. Confirmed by grep: none of
these credential names appear anywhere in `apps/api` or `apps/worker` today.

- [ ] **Google Ads developer token + live sync.** `apps/api/src/routes/v1.ts` Google Ads endpoints
      return advisor output computed from seeded data. No developer token, no live campaign
      fetch/push exists yet.
- [ ] **Meta App Review + live sync.** Same situation for Meta Ads — App Review approval and a
      live Marketing API integration aren't built.
- [ ] **DataForSEO paid key.** Backlink analysis, real keyword research volume, and site-audit-at-scale
      all need a paid DataForSEO key; none of that is wired up.
- [ ] **Google OAuth already works** for Google Search Console specifically (`GOOGLE_CLIENT_ID` /
      `GOOGLE_CLIENT_SECRET` in `apps/api/.env.example`) — this is the one platform connection
      that's actually live end-to-end.

If launching without these, the honest move is telling users upfront which channels are live vs.
"coming soon" rather than letting seeded data pass as real numbers.

## 3. Legal — blocks launch

- [ ] **`/terms` and `/privacy` need a real lawyer's review.** What's shipped
      (`apps/web/app/(marketing)/terms`, `.../privacy`) is a reasonable starting template, not a
      reviewed legal document — both pages say so at the top. Every `[bracketed placeholder]`
      needs a real answer: legal entity name, jurisdiction, support/privacy contact emails, and
      confirmation of which regional privacy laws (GDPR, CCPA/CPRA, others) actually apply given
      where your users are.
- [ ] **Footer still has real placeholder links.** `SiteFooter.tsx` — About, Blog, Careers,
      Security all still point to `#`. Fine to launch without a blog, less fine to leave a
      "Security" link dead if security-conscious buyers go looking for it.

## 4. Security hardening (M5 P5.4) — done vs. still worth doing

**Done and verified this phase:**
- `@fastify/helmet` registered for security headers (`apps/api/src/app.ts`).
- CORS already scoped to `WEB_ORIGIN`, not wide open.
- Env validation at boot (`apps/api/src/env.ts`) — fails fast with every missing required var
  listed at once, warns about unconfigured optional integrations.
- Ran a real `pnpm audit --prod` and found `better-auth` pinned at 1.4.21 with multiple
  critical/high CVEs (OAuth refresh-token replay, stored XSS, account takeover) patched in
  1.6.11+. Upgraded to 1.6.23, found and fixed a real transitive dependency conflict
  (`@better-auth/cli` was pinned at the old version, pulling in a conflicting `better-call`),
  verified with a live signup → session → workspace-creation flow against real Postgres, then
  the full test suite. **Re-run `pnpm audit --prod` periodically** — this isn't a one-time fix,
  it's a dependency that needs staying current.

**Not done — recommended before launch:**
- [ ] Re-run `pnpm audit --prod` — findings other than `better-auth` (e.g. `vite`/`vitest`, dev-only)
      weren't individually triaged here; confirm nothing shipped depends on them at runtime.
- [ ] CSP is at helmet's default, not hand-tuned. Fine for a JSON-only API; revisit if this app
      ever serves HTML/inline scripts directly.
- [ ] No error monitoring (Sentry or equivalent) — a production crash currently only shows up in
      logs, not an alert.
- [ ] No uptime/health monitoring beyond the `/health` endpoint existing — nothing polls it yet.
- [ ] Rate limiting exists (`@fastify/rate-limit`, M2 P2.8) but limits haven't been load-tested
      against realistic traffic.

## 5. Infrastructure — blocks scale, not necessarily launch

- [ ] **ClickHouse Cloud.** Currently runs locally via Docker (`docs/blueprint/DECISIONS.md` D3,
      free-tier-first). Needs a real ClickHouse Cloud instance (or equivalent) before this can run
      anywhere but a single dev machine.
- [ ] **No scheduler exists.** Celery/Beat is deferred per D2. This blocks: trial-ending email
      reminders (§1), the Intelligence Engine's 4-hourly rule evaluation
      (`docs/plan/M3-channel-modules/` P3.4 remainder), and the Creative Fatigue Monitor's
      scheduled alerts. All three are built and tested against on-demand calls; none run on a
      schedule yet.
- [ ] **pgvector extension** must be enabled on the production Neon instance
      (`CREATE EXTENSION vector;`) if not already done.

## 6. Analytics (M5 P5.4)

- [ ] **Pick and configure a product analytics provider.** `apps/web/lib/analytics.ts` scaffolds
      PostHog — that's my pick, not a decision recorded anywhere in the blueprint, since none was
      specified. Swap it for something else if you'd rather; every call site is in that one file.
      Set `NEXT_PUBLIC_POSTHOG_KEY` (and `NEXT_PUBLIC_POSTHOG_HOST` if self-hosting) to activate it
      — without a key, every analytics call safely no-ops.
- [ ] Three events are wired: `account_created`, `workspace_created`, `checkout_started` /
      `checkout_completed`. That's a funnel skeleton, not full instrumentation — revenue-critical
      views (pricing page visits, plan comparisons, upgrade prompts triggered by plan limits)
      aren't tracked yet.
- [ ] Once analytics is live, add a cookie-consent banner if serving EU users — the current
      `/privacy` draft says cookie disclosure will be updated once the analytics stack is
      finalized (see its §8).

## 7. Final pre-launch pass

- [ ] Re-run the full test suite against a clean environment with all real infra up (Postgres,
      Redis, ClickHouse) — the sandbox this was built in could only verify against
      Postgres directly; Redis/ClickHouse-dependent tests have never actually run green here.
- [ ] Confirm `NODE_ENV=production` behavior end-to-end — logging verbosity, error message detail
      returned to clients, etc.
- [ ] DNS, hosting, and TLS for the production domain (not part of this codebase).
- [ ] Confirm the annual-billing 20% discount mentioned on `/pricing` and in `/terms` actually
      exists as a Stripe Price before advertising it — it's copy right now, not a wired discount.
