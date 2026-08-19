# Go-Live Checklist

Status: living document — updated as gated items get resolved. Last updated: 2026-08-20.

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
- [x] **Trial-ending-soon reminders now run automatically.** ~~Nothing calls `checkTrialsEndingSoon()`
      periodically~~ — resolved 2026-07-26: `apps/api/src/scheduler.ts` wires it to a daily
      `node-cron` job (09:00 UTC). No further action needed here.
- [x] **Plan limits are enforced for recommendations.** ~~Metering has no real call site yet~~ —
      resolved 2026-08-13 (`b16dda7`). `ensureGenerated` checks `getRemainingAllowance` and then
      records `recordUsage(workspaceId, 'recommendations_generated', created)`
      (`apps/api/src/recommendations.ts`); workspace creation is capped by
      `assertCanCreateWorkspace`; `assertFeatureEnabled` gates white-label branding and API access
      (`apps/api/src/api-keys.ts`). The first-run onboarding batch (`before === 0`) is deliberately
      left unmetered — see `docs/AUDIT-2026-08-13-codebase.md`. Starter customers are now held to
      the 5/week the pricing page advertises, so this no longer gates launch.
- [ ] **`ai_creatives_generated` is still unmetered.** The metric and its plan mapping exist
      (`apps/api/src/plan-limits.ts`), but nothing calls `recordUsage` for it. M4 P4.2 is the phase
      that would generate the creatives worth metering, so this only matters once that ships.

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
- [x] **Dependency audit re-run and triaged 2026-08-20.** Every runtime-reachable high was fixed by
      upgrading: `fastify` 5.9.0 → 5.12.1 (patched `find-my-way`, HTTP/2 DoS), `@fastify/swagger-ui`
      5 → 6 (pulls `@fastify/static` 10.1.3, fixing a route-guard bypass via path traversal that was
      reachable through the public API docs UI), `@fastify/swagger` → 9.8.1 and `fast-uri` → 3.1.5
      (host confusion), `@fastify/helmet` 12 → 13, `brace-expansion` → 5.0.9, `drizzle-orm`
      0.38.4 → 0.45.2 (SQL injection via improperly escaped identifiers — this sat in the auth and
      every data path), and `next` 15.5.20 → 15.5.23 in `apps/web` (two SSRF highs plus a Server
      Actions DoS). The drizzle bump also resolved the duplicate-copy problem behind
      `docs/AUDIT-2026-08-13-codebase.md` #9 and cleared every peer warning — `pnpm peers check`
      now reports none. Verified with a full typecheck, 174 API tests, 128 logic tests, and a real
      Next production build.
- [ ] **Two framework-pinned transitives remain, both deliberately not forced.** `next` pins
      `postcss` at 8.4.31 (advisory wants >=8.5.12) and declares `sharp: ^0.34.3` optional (advisory
      wants >=0.35.0). Overriding either would push Next outside its own supported range for a
      build-time CSS tool and an optional image-processing dep. Re-check when Next 15 moves its
      pins, or when a runtime path actually reaches them.
- [ ] Re-run `pnpm audit` before each release — this is not a one-time fix.
- [ ] CSP is at helmet's default, not hand-tuned. Fine for a JSON-only API; revisit if this app
      ever serves HTML/inline scripts directly.
- [x] **Error monitoring is wired.** `apps/api/src/monitoring.ts` reports crashes via Sentry when
      `SENTRY_DSN` is set, with process-level handlers, and degrades to logs-only when it isn't —
      the same optional-integration shape as Stripe and Resend. Set `SENTRY_DSN` in production to
      turn it on.
- [ ] **Nothing polls the health endpoints yet.** `/health` (liveness) and `/health/ready`
      (readiness — reports each dependency by name, 200/ok only when all are reachable) both exist
      and are covered by tests. What is missing is an external uptime service pointed at them,
      which needs a deployed URL first. This is the last open item from
      `docs/AUDIT-2026-08-13-codebase.md` #10.
- [ ] Rate limiting exists (`@fastify/rate-limit`, M2 P2.8) but limits haven't been load-tested
      against realistic traffic.
- [ ] **Public API (`/api/public/v1/*`, M4 P4.4) shares the same global rate limit as everything
      else** (`@fastify/rate-limit`, 200 req/min per `RATE_LIMIT_MAX`). External API consumers
      (Zapier, a customer's scripts) may want per-key limits distinct from the app's own browser
      traffic before this is advertised as a real integration surface.

## 5. Infrastructure — blocks scale, not necessarily launch

- [ ] **ClickHouse Cloud.** Currently runs locally via Docker (`docs/blueprint/DECISIONS.md` D3,
      free-tier-first). Needs a real ClickHouse Cloud instance (or equivalent) before this can run
      anywhere but a single dev machine.
- [x] **Scheduler now exists.** ~~No scheduler exists~~ — resolved 2026-07-26: `apps/api/src/scheduler.ts`,
      a lightweight `node-cron` in-process scheduler (Celery/Beat remains deferred per D2 — this
      isn't that, it's a smaller single-dependency alternative). Wires trial-ending reminders
      (daily @ 09:00 UTC), the autonomous intelligence tick (hourly — consolidated 2026-08-13 from what
      had been an unguarded 4h refresh, now persistent-dedupe so alerts re-fire only on change), and
      a stuck-job sweep (every 15m). **Still not wired**: the Creative
      Fatigue Monitor's alerts — deliberately, not an oversight. `ensureFatigueAlerts` generates
      alerts exactly once per workspace ever (`if (existing.length > 0) return`); scheduling it
      would be a guaranteed no-op for any workspace already past onboarding, and it runs over a
      static fixture besides (not live Meta creative data), so even a redesigned version would
      produce identical output every call until that's connected. See
      `docs/plan/M4-v2-automation/progress.md` for the full reasoning.
- [ ] **WebSocket transport's room registry is per-process.** `apps/api/src/ws.ts` holds connected
      sockets in an in-memory `Map`, matching this app's current single-long-running-process
      deployment model (same assumption the scheduler makes). The design already supports scaling to
      multiple API instances — every event goes through Redis pub/sub rather than being delivered
      locally-only, specifically so any instance subscribed to the channel can relay it — but this
      hasn't been tested with more than one instance running. Verify before running multiple API
      replicas behind a load balancer, and confirm the load balancer's WS upgrade handling / sticky
      sessions aren't required (they shouldn't be, given the Redis relay, but confirm for real).
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
