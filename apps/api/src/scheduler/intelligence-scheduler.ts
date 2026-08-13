import { getWeeklyReport } from '../intelligence.js'
import { getMerTrend } from '../analytics.js'
import { getFatigueResults } from '../fatigue.js'
import { publish } from '../ws.js'
import { withRedisLock } from './lock.js'
import { selectDueWorkspaces } from './schedule.js'
import { emitIfChanged } from './alerts.js'
import { listWorkspacesWithLastRun, recordSchedulerRun } from './queries.js'
import { runAutomationForWorkspace } from '../automation/actions.js'

/**
 * The autonomous intelligence tick: one guarded pass that refreshes every workspace whose report is
 * stale per its own cadence and raises alerts only for conditions that actually changed.
 *
 * Publishes through `../ws.js` — the single WebSocket transport (Redis channel
 * `growthos:ws-events`, the same one the Python worker publishes to). This module previously had
 * its own `../ws/events.js` transport on a *different* channel; that duplicate was deleted in the
 * post-merge audit (docs/AUDIT-2026-08-13-post-merge.md #4) and this is the surviving path.
 */

const LOCK_KEY = 'scheduler:intelligence:lock'

/**
 * How long the tick's lock is held if the process dies mid-run. Bounded deliberately: it must be
 * comfortably longer than a worst-case tick but far shorter than the schedule interval, or a single
 * crash would suppress every subsequent tick until the TTL expired.
 */
function lockTtlMs(): number {
  return Number(process.env.SCHEDULER_LOCK_TTL_MS ?? 10 * 60 * 1000)
}

/** Default staleness threshold — the report is a *weekly* one, and each workspace can override this via `automation_config.cadenceMs`. */
function cadenceMs(): number {
  return Number(process.env.INTELLIGENCE_CADENCE_MS ?? 7 * 24 * 60 * 60 * 1000)
}

/**
 * Ceiling on workspaces refreshed per tick, so a tick's duration stays bounded by a constant rather
 * than by customer count and cannot outlast its own lock. Anything left over is picked up next tick,
 * stalest-first — see `selectDueWorkspaces`.
 */
function maxWorkspacesPerTick(): number {
  return Number(process.env.SCHEDULER_MAX_WORKSPACES_PER_TICK ?? 25)
}

/**
 * Refresh one workspace: regenerate + persist its weekly report (pushing intelligence:report_ready),
 * then run the autonomous alert detectors. A MER anomaly or a newly-fatigued creative emits its
 * event only when the condition is new/changed vs the last one we alerted on (persistent dedupe in
 * `automation_alerts`). Returns the number of alerts emitted.
 */
export async function refreshWorkspace(workspaceId: string): Promise<number> {
  const report = await getWeeklyReport(workspaceId)
  await publish({
    type: 'intelligence:report_ready',
    workspaceId,
    payload: { periodStart: report.weekStart },
  })

  let alerts = 0

  // Blended-MER anomaly. Signature encodes the rounded change so a *different* swing re-alerts.
  const mer = await getMerTrend(workspaceId, 14)
  const merSig = mer.anomaly.detected ? `mer:${mer.anomaly.changePercent}` : ''
  if (await emitIfChanged(workspaceId, 'mer_anomaly', merSig)) {
    await publish({
      type: 'analytics:mer_alert',
      workspaceId,
      payload: { changePercent: mer.anomaly.changePercent, blendedMER: mer.summary?.blendedMER },
    })
    alerts++
  }

  // Creative fatigue. Signature is the set of non-healthy creatives + status, so it re-alerts when a
  // new creative fatigues or one recovers.
  const fatigued = getFatigueResults().filter((f) => f.status !== 'healthy')
  const fatigueSig = fatigued.map((f) => `${f.name}:${f.status}`).sort().join('|')
  if (await emitIfChanged(workspaceId, 'fatigue', fatigueSig)) {
    await publish({
      type: 'meta:fatigue_alert',
      workspaceId,
      payload: { adSetId: fatigued[0]?.name ?? 'unknown' },
    })
    alerts++
  }

  return alerts
}

/**
 * One guarded tick: win the lock, find due workspaces (per-workspace cadence + enabled), refresh
 * each. Per-workspace errors are logged and skipped so one failure never stalls the rest. Records a
 * scheduler_runs row for observability. Returns how many workspaces were refreshed (0 if another
 * instance held the lock).
 */
export async function runSchedulerTick(now: Date = new Date()): Promise<number> {
  let refreshed = 0
  await withRedisLock(LOCK_KEY, lockTtlMs(), async () => {
    const startedAt = new Date()
    const rows = await listWorkspacesWithLastRun()
    const due = selectDueWorkspaces(rows, now, cadenceMs(), maxWorkspacesPerTick())
    const refreshedIds: string[] = []
    const errors: { workspaceId: string; message: string }[] = []
    let alertCount = 0

    let automationProposed = 0

    for (const workspaceId of due) {
      try {
        alertCount += await refreshWorkspace(workspaceId)
        refreshed++
        refreshedIds.push(workspaceId)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[scheduler] refresh failed for workspace ${workspaceId}:`, err)
        errors.push({ workspaceId, message })
      }

      // Automation planning (P4.3a) runs independently of the report refresh: a ClickHouse hiccup
      // that stops one must not also stop the other, so this sits outside the catch above rather
      // than inside the same try. A workspace with no enabled rules returns immediately.
      try {
        const outcome = await runAutomationForWorkspace(workspaceId, now)
        automationProposed += outcome.proposed
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[scheduler] automation planning failed for workspace ${workspaceId}:`, err)
        errors.push({ workspaceId, message })
      }
    }

    await recordSchedulerRun({
      startedAt,
      refreshedCount: refreshed,
      alertCount,
      errorCount: errors.length,
      details: { refreshed: refreshedIds, errors, automationProposed },
    })
  })
  return refreshed
}
