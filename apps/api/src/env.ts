import { z } from 'zod'

/**
 * Env validation (M5 P5.4 hardening). Without this, a missing required var surfaces as a
 * confusing runtime error from wherever it's first read (e.g. `packages/db/src/client.ts`
 * throwing mid-request the first time a query runs) instead of a clear failure at boot. Called
 * once from `index.ts` — deliberately NOT from `app.ts`, since tests build the app directly via
 * `buildApp()` with a minimal test `.env` and shouldn't be forced to set every optional var.
 */

const requiredSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required — see apps/api/.env.example.'),
  BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required — see apps/api/.env.example.'),
  BETTER_AUTH_URL: z.string().min(1, 'BETTER_AUTH_URL is required — see apps/api/.env.example.'),
})

// Optional-but-gated integrations: absence never crashes anything (each has its own
// INTEGRATION_NOT_CONNECTED / no-op fallback), but it's worth telling the operator what's off.
// Only integrations with a REAL env-checked gate belong here (see billing.ts / emails.ts). Google
// Ads live sync, Meta Ads live sync, and DataForSEO-powered SEO features are also unconfigured in
// every environment right now, but there's no env var to check yet — those advisors always
// operate on seeded data; there's no live-fetch branch coded, so no credential gate to warn
// about. See docs/plan/M5-launch-monetization/GO_LIVE_CHECKLIST.md for the full list of what's
// actually required before launch, including those.
const OPTIONAL_INTEGRATIONS: Array<{ vars: string[]; label: string }> = [
  { vars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], label: 'Stripe billing (checkout/webhook/portal will 409)' },
  { vars: ['RESEND_API_KEY'], label: 'Resend lifecycle emails (sends will silently no-op)' },
  // Google Search Console is the one integration that genuinely works end-to-end, and it was the
  // only one missing from this list.
  { vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], label: 'Google OAuth / Search Console sync (connect will fail)' },
]

/**
 * Secrets that are optional only while nothing uses them, and mandatory the moment something does.
 *
 * Both are security-critical and neither was checked anywhere: `TOKEN_ENCRYPTION_KEY` encrypts OAuth
 * tokens at rest, and `OAUTH_STATE_SECRET` signs the `state` parameter that makes the OAuth callback
 * CSRF-resistant. Missing, they don't fail at boot — they throw deep inside a callback the user
 * experiences as a generic "couldn't connect" redirect, which is the hardest possible place to
 * notice that tokens are unprotected.
 *
 * Tying them to the presence of OAuth credentials is what keeps this honest: an environment with no
 * OAuth configured is legitimately allowed to omit them, and one that configures OAuth cannot.
 */
const CONDITIONAL_SECRETS: Array<{ requiredWhen: string; vars: string[]; why: string }> = [
  {
    requiredWhen: 'GOOGLE_CLIENT_ID',
    vars: ['TOKEN_ENCRYPTION_KEY', 'OAUTH_STATE_SECRET'],
    why: 'OAuth is configured, so tokens must be encryptable at rest and callback state must be signable.',
  },
]

/** Throws with every missing required var listed at once (not just the first one hit). */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  const messages: string[] = []

  const result = requiredSchema.safeParse(env)
  if (!result.success) {
    messages.push(
      ...result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`),
    )
  }

  for (const { requiredWhen, vars, why } of CONDITIONAL_SECRETS) {
    if (!env[requiredWhen]) continue
    for (const v of vars) {
      if (!env[v]) messages.push(`  - ${v}: required because ${requiredWhen} is set. ${why}`)
    }
  }

  if (messages.length > 0) {
    throw new Error(`Missing required environment variables:\n${messages.join('\n')}`)
  }
}

/** Logs (never throws) which optional integrations are unconfigured, so it's visible at boot rather than discovered via a 409 later. */
export function logIntegrationStatus(env: NodeJS.ProcessEnv = process.env): void {
  const unconfigured = OPTIONAL_INTEGRATIONS.filter(({ vars }) => vars.some((v) => !env[v]))
  if (unconfigured.length === 0) return
  console.warn(
    `[env] Not configured (safe to ignore outside production): ${unconfigured
      .map((i) => i.label)
      .join('; ')}`,
  )
}
