import cron from 'node-cron'
import { db, schema } from '@growthos/db'
import { checkTrialsEndingSoon } from './billing.js'
import { getWeeklyReport } from './intelligence.js'

/**
 * Lightweight in-process scheduler. Celery/Beat was explicitly deferred (DECISIONS.md D2) in
 * favor of free-tier-first infra; this uses `node-cron` instead — a single dependency, no
 * separate deployable service, runs inside the same long-running Fastify process (apps/api isn't
 * serverless). Registered from index.ts ONLY, never app.ts, so tests that build the app via
 * `buildApp()` never accidentally start a background cron loop mid-test-suite.
 *
 * Wires the two dormant scheduled tasks that genuinely benefit from periodic execution:
 *
 *  - Trial-ending-soon reminders (billing.ts `checkTrialsEndingSoon`) — built in M5 P5.3, never
 *    wired to anything since. Dedupes via `trialReminderSentAt`, safe to call as often as needed.
 *  - Intelligence Engine weekly report refresh (intelligence.ts `getWeeklyReport`) — recomputes
 *    each workspace's channel spend/revenue/ROAS from current ClickHouse data and updates the
 *    current week's report (idempotent per week — see `intelligence_reports`' unique constraint).
 *
 * Deliberately NOT wired: the Creative Fatigue Monitor's alerts (fatigue.ts
 * `ensureFatigueAlerts`). Its current design generates `fatigue_alert` recommendations exactly
 * once per workspace, ever (`if (existing.length > 0) return`) — for any workspace that's already
 * been through onboarding, calling it again is a guaranteed no-op. Scheduling a no-op would
 * misrepresent this as a working periodic feature. It's also computed over a static fixture
 * (`@growthos/logic/fixtures` creatives — not live Meta Ads creative-level data), so even a
 * redesigned "re-evaluate every run" version would produce identical output on every single call
 * until real creative data is connected — the same "gated on a live integration" status as Google
 * Ads/Meta everywhere else in this codebase, not something a scheduler can fix on its own.
 */

/** All workspace IDs — used to fan the per-workspace intelligence refresh out across every workspace. */
export async function listActiveWorkspaceIds(): Promise<string[]> {
  const rows = await db.select({ id: schema.workspaces.id }).from(schema.workspaces)
  return rows.map((r) => r.id)
}

export async function runTrialReminders(): Promise<void> {
  try {
    const { remindersSent } = await checkTrialsEndingSoon()
    console.log(`[scheduler] trial reminders: sent ${remindersSent}`)
  } catch (err) {
    console.error('[scheduler] trial reminders failed', err)
  }
}

export async function runIntelligenceRefresh(): Promise<void> {
  const workspaceIds = await listActiveWorkspaceIds()
  let succeeded = 0
  for (const id of workspaceIds) {
    try {
      await getWeeklyReport(id)
      succeeded++
    } catch (err) {
      // One workspace's ClickHouse hiccup should never take down the whole refresh cycle — same
      // "one bad job never kills the loop" principle as the worker's job consumer.
      console.error(`[scheduler] intelligence refresh failed for workspace ${id}`, err)
    }
  }
  console.log(`[scheduler] intelligence refresh: ${succeeded}/${workspaceIds.length} workspaces`)
}

/** Registers the cron jobs. Call once, at process boot (index.ts) — never from app.ts/tests. */
export function startScheduler(): void {
  // Daily at 09:00 UTC — trial windows are measured in days, no need to check more often.
  cron.schedule('0 9 * * *', () => void runTrialReminders())
  // Every 4 hours, on the hour — matches the blueprint's stated Intelligence Engine cadence.
  cron.schedule('0 */4 * * *', () => void runIntelligenceRefresh())
  console.log('[scheduler] started — trial reminders daily @ 09:00 UTC, intelligence refresh every 4h')
}
