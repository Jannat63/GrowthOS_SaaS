import { desc, sql } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { AutomationConfig, SchedulerRun } from '@growthos/types'
import type { WorkspaceRun } from './schedule.js'

/**
 * Every workspace with the timestamp of its most recent intelligence report (null = never run) and
 * its automation config. Left join + max(createdAt) so brand-new workspaces surface as
 * `lastRunAt: null` and get refreshed on the first tick.
 */
export async function listWorkspacesWithLastRun(): Promise<WorkspaceRun[]> {
  const rows = await db
    .select({
      workspaceId: schema.workspaces.id,
      config: schema.workspaces.automationConfig,
      lastRunAt: sql<string | null>`max(${schema.intelligenceReports.createdAt})`,
    })
    .from(schema.workspaces)
    .leftJoin(
      schema.intelligenceReports,
      sql`${schema.intelligenceReports.workspaceId} = ${schema.workspaces.id}`,
    )
    .groupBy(schema.workspaces.id)

  return rows.map((r) => ({
    workspaceId: r.workspaceId,
    lastRunAt: r.lastRunAt ? new Date(r.lastRunAt) : null,
    config: (r.config as AutomationConfig | null) ?? null,
  }))
}

export interface RunMetrics {
  startedAt: Date
  refreshedCount: number
  alertCount: number
  errorCount: number
  details: {
    refreshed: string[]
    errors: { workspaceId: string; message: string }[]
    /** Automation actions proposed this tick (P4.3a). */
    automationProposed?: number
  }
}

/** Persist one scheduler tick's metrics (observability). Best-effort — never throws into the tick. */
export async function recordSchedulerRun(m: RunMetrics): Promise<void> {
  try {
    await db.insert(schema.schedulerRuns).values({
      startedAt: m.startedAt,
      finishedAt: new Date(),
      refreshedCount: m.refreshedCount,
      alertCount: m.alertCount,
      errorCount: m.errorCount,
      details: m.details,
    })
  } catch (err) {
    console.error('[scheduler] failed to record run metrics:', err)
  }
}

function toApi(row: typeof schema.schedulerRuns.$inferSelect): SchedulerRun {
  return {
    id: row.id,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    refreshedCount: row.refreshedCount,
    alertCount: row.alertCount,
    errorCount: row.errorCount,
    details: (row.details as SchedulerRun['details']) ?? null,
  }
}

/** Most recent scheduler runs, newest first (observability read model). */
export async function listSchedulerRuns(limit = 20): Promise<SchedulerRun[]> {
  const rows = await db
    .select()
    .from(schema.schedulerRuns)
    .orderBy(desc(schema.schedulerRuns.startedAt))
    .limit(limit)
  return rows.map(toApi)
}
