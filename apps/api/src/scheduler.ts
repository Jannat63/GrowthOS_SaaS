import cron from 'node-cron'
import { db, schema } from '@growthos/db'
import { checkTrialsEndingSoon } from './billing.js'
import { withRedisLock } from './scheduler/lock.js'
import { runSchedulerTick } from './scheduler/intelligence-scheduler.js'

/**
 * Lightweight in-process scheduler. Celery/Beat was explicitly deferred (DECISIONS.md D2) in
 * favor of free-tier-first infra; this uses `node-cron` instead — a single dependency, no
 * separate deployable service, runs inside the same long-running Fastify process (apps/api isn't
 * serverless). Registered from index.ts ONLY, never app.ts, so tests that build the app via
 * `buildApp()` never accidentally start a background cron loop mid-test-suite.
 *
 * Two scheduled tasks:
 *
 *  - Trial-ending-soon reminders (billing.ts `checkTrialsEndingSoon`), daily. Idempotent per trial
 *    via `trialReminderSentAt`, which is now *claimed* before the send rather than written after it.
 *  - The autonomous intelligence tick (`scheduler/intelligence-scheduler.ts`), hourly. It refreshes
 *    only workspaces whose report is stale per their own `automation_config.cadenceMs`, and raises
 *    `analytics:mer_alert` / `meta:fatigue_alert` only when the underlying condition has actually
 *    changed since the last alert (persistent signatures in `automation_alerts`).
 *
 * Both tasks run under a Redis lock, so N API instances produce one run, not N. That matters most
 * for the trial reminder: without it, two instances ticking at the same second would each read the
 * same un-reminded trials and both send the customer an email.
 *
 * The tick used to be two unguarded cron jobs here (`runIntelligenceRefresh` refreshing every
 * workspace every 4h, `runMerAnomalyCheck` re-publishing the same anomaly forever). Both were
 * replaced by the deduped, locked, per-workspace-cadence tick — see
 * docs/AUDIT-2026-08-13-post-merge.md #1, #8, #10.
 *
 * Deliberately NOT wired: the Creative Fatigue Monitor's recommendation generator (fatigue.ts
 * `ensureFatigueAlerts`). It generates `fatigue_alert` recommendations exactly once per workspace,
 * ever (`if (existing.length > 0) return`), so scheduling it would misrepresent a guaranteed no-op
 * as a working periodic feature. The fatigue *alert* (the WS event) is scheduled — that one is
 * genuinely re-evaluated each tick against the current creative set.
 */

const TRIAL_LOCK_KEY = 'scheduler:trial-reminders:lock'
const TRIAL_LOCK_TTL_MS = 5 * 60 * 1000

/** All workspace IDs. Kept as the scheduler's view of "who exists" — used by tests and callers that need a plain list. */
export async function listActiveWorkspaceIds(): Promise<string[]> {
  const rows = await db.select({ id: schema.workspaces.id }).from(schema.workspaces)
  return rows.map((r) => r.id)
}

export async function runTrialReminders(): Promise<void> {
  try {
    const ran = await withRedisLock(TRIAL_LOCK_KEY, TRIAL_LOCK_TTL_MS, async () => {
      const { remindersSent } = await checkTrialsEndingSoon()
      console.log(`[scheduler] trial reminders: sent ${remindersSent}`)
    })
    if (!ran) console.log('[scheduler] trial reminders: skipped, another instance holds the lock')
  } catch (err) {
    console.error('[scheduler] trial reminders failed', err)
  }
}

/**
 * One intelligence tick. Never throws — a Redis or Neon outage must not take down the cron loop
 * (nor the boot path, since index.ts calls startScheduler() without awaiting anything).
 */
export async function runIntelligenceRefresh(): Promise<void> {
  try {
    const refreshed = await runSchedulerTick()
    console.log(`[scheduler] intelligence refresh: ${refreshed} workspace(s) refreshed`)
  } catch (err) {
    console.error('[scheduler] intelligence refresh failed', err)
  }
}

/** Registers the cron jobs. Call once, at process boot (index.ts) — never from app.ts/tests. */
export function startScheduler(): void {
  // Daily at 09:00 UTC — trial windows are measured in days, no need to check more often.
  cron.schedule('0 9 * * *', () => void runTrialReminders())
  // Hourly. The tick itself decides what's actually due, so this only sets the granularity at which
  // a workspace's own cadence (default: weekly) can be honoured.
  cron.schedule('0 * * * *', () => void runIntelligenceRefresh())
  console.log('[scheduler] started — trial reminders daily @ 09:00 UTC, intelligence tick hourly')
}
