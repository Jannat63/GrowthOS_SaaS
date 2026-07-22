import { getWeeklyReport } from '../intelligence.js'
import { getMerTrend } from '../analytics.js'
import { getFatigueResults } from '../fatigue.js'
import { publishEvent } from '../ws/events.js'
import { withRedisLock } from './lock.js'
import { selectDueWorkspaces } from './schedule.js'
import { emitIfChanged } from './alerts.js'
import { listWorkspacesWithLastRun, recordSchedulerRun } from './queries.js'

const LOCK_KEY = 'scheduler:intelligence:lock'

function intervalMs(): number {
  return Number(process.env.SCHEDULER_INTERVAL_MS ?? 60_000)
}
function cadenceMs(): number {
  return Number(process.env.INTELLIGENCE_CADENCE_MS ?? 7 * 24 * 60 * 60 * 1000)
}

/**
 * Refresh one workspace: regenerate + persist its weekly report (pushing report:ready), then run the
 * autonomous alert detectors. A MER anomaly or a newly-fatigued creative emits its event only when
 * the condition is new/changed vs the last one we alerted (persistent dedupe). Returns alerts emitted.
 */
export async function refreshWorkspace(workspaceId: string): Promise<number> {
  const report = await getWeeklyReport(workspaceId)
  await publishEvent(workspaceId, { type: 'report:ready', workspaceId, periodStart: report.weekStart })

  let alerts = 0

  // Blended-MER anomaly. Signature encodes the rounded change so a *different* swing re-alerts.
  const mer = await getMerTrend(workspaceId, 14)
  const merSig = mer.anomaly.detected ? `mer:${mer.anomaly.changePercent}` : ''
  if (await emitIfChanged(workspaceId, 'mer_anomaly', merSig)) {
    await publishEvent(workspaceId, { type: 'analytics:mer_alert', workspaceId })
    alerts++
  }

  // Creative fatigue. Signature is the set of non-healthy creatives + status, so it re-alerts when a
  // new creative fatigues or one recovers.
  const fatigued = getFatigueResults().filter((f) => f.status !== 'healthy')
  const fatigueSig = fatigued.map((f) => `${f.name}:${f.status}`).sort().join('|')
  if (await emitIfChanged(workspaceId, 'fatigue', fatigueSig)) {
    await publishEvent(workspaceId, {
      type: 'meta:fatigue_alert',
      workspaceId,
      adSetId: fatigued[0]?.name ?? 'unknown',
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
  await withRedisLock(LOCK_KEY, intervalMs(), async () => {
    const startedAt = new Date()
    const rows = await listWorkspacesWithLastRun()
    const due = selectDueWorkspaces(rows, now, cadenceMs())
    const refreshedIds: string[] = []
    const errors: { workspaceId: string; message: string }[] = []
    let alertCount = 0

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
    }

    await recordSchedulerRun({
      startedAt,
      refreshedCount: refreshed,
      alertCount,
      errorCount: errors.length,
      details: { refreshed: refreshedIds, errors },
    })
  })
  return refreshed
}

/** Start the recurring scheduler. Returns a stop function that clears the interval. */
export function startIntelligenceScheduler(): () => void {
  const timer = setInterval(() => {
    runSchedulerTick().catch((err) => console.error('[scheduler] tick failed:', err))
  }, intervalMs())
  timer.unref?.() // don't keep the process alive solely for the scheduler
  return () => clearInterval(timer)
}
