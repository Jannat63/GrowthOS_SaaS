import cron from 'node-cron'
import { db, schema } from '@growthos/db'
import { checkTrialsEndingSoon } from './billing.js'
import { getWeeklyReport } from './intelligence.js'
import { getMerTrend } from './analytics.js'
import { publish } from './ws.js'

/**
 * Lightweight in-process scheduler. Celery/Beat was explicitly deferred (DECISIONS.md D2) in
 * favor of free-tier-first infra; this uses `node-cron` instead — a single dependency, no
 * separate deployable service, runs inside the same long-running Fastify process (apps/api isn't
 * serverless). Registered from index.ts ONLY, never app.ts, so tests that build the app via
 * `buildApp()` never accidentally start a background cron loop mid-test-suite.
 *
 * Wires the three dormant scheduled tasks that genuinely benefit from periodic execution:
 *
 *  - Trial-ending-soon reminders (billing.ts `checkTrialsEndingSoon`) — built in M5 P5.3, never
 *    wired to anything since. Dedupes via `trialReminderSentAt`, safe to call as often as needed.
 *  - Intelligence Engine weekly report refresh (intelligence.ts `getWeeklyReport`) — recomputes
 *    each workspace's channel spend/revenue/ROAS from current ClickHouse data and updates the
 *    current week's report (idempotent per week — see `intelligence_reports`' unique constraint).
 *    Publishes `intelligence:report_ready` (WS) on each successful refresh.
 *  - Blended MER anomaly check (analytics.ts `getMerTrend`) — checked here, on a controlled 4h
 *    cadence, rather than from the route handler on every page load/poll: `getMerTrend` has no
 *    persistence or dedup of its own, so publishing `analytics:mer_alert` from the read path would
 *    re-fire the same alert every time someone had the analytics page open. Checking it here
 *    instead means the event genuinely means "something was monitored and found anomalous," not
 *    "someone happened to load a page."
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

/** All workspace IDs — used to fan the per-workspace refresh tasks out across every workspace. */
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
      void publish({ type: 'intelligence:report_ready', workspaceId: id })
    } catch (err) {
      // One workspace's ClickHouse hiccup should never take down the whole refresh cycle — same
      // "one bad job never kills the loop" principle as the worker's job consumer.
      console.error(`[scheduler] intelligence refresh failed for workspace ${id}`, err)
    }
  }
  console.log(`[scheduler] intelligence refresh: ${succeeded}/${workspaceIds.length} workspaces`)
}

export async function runMerAnomalyCheck(): Promise<void> {
  const workspaceIds = await listActiveWorkspaceIds()
  let anomalies = 0
  for (const id of workspaceIds) {
    try {
      const { anomaly, summary } = await getMerTrend(id, 30)
      if (anomaly.detected) {
        anomalies++
        void publish({
          type: 'analytics:mer_alert',
          workspaceId: id,
          payload: { changePercent: anomaly.changePercent, blendedMER: summary.blendedMER },
        })
      }
    } catch (err) {
      console.error(`[scheduler] MER anomaly check failed for workspace ${id}`, err)
    }
  }
  console.log(`[scheduler] MER anomaly check: ${anomalies}/${workspaceIds.length} workspaces flagged`)
}

/** Registers the cron jobs. Call once, at process boot (index.ts) — never from app.ts/tests. */
export function startScheduler(): void {
  // Daily at 09:00 UTC — trial windows are measured in days, no need to check more often.
  cron.schedule('0 9 * * *', () => void runTrialReminders())
  // Every 4 hours, on the hour — matches the blueprint's stated Intelligence Engine cadence.
  cron.schedule('0 */4 * * *', () => void runIntelligenceRefresh())
  // Offset 30 minutes from the intelligence refresh so the two don't hit ClickHouse at the same instant.
  cron.schedule('30 */4 * * *', () => void runMerAnomalyCheck())
  console.log(
    '[scheduler] started — trial reminders daily @ 09:00 UTC, intelligence refresh + MER anomaly check every 4h',
  )
}
