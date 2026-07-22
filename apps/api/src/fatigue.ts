import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { ScoredCreative } from '@growthos/types'
import { detectFatigueAll, fatigueAlertRecommendation } from '@growthos/logic'
import { creatives } from '@growthos/logic/fixtures'
import { publishEvent } from './ws/events.js'

export function getFatigueResults(): ScoredCreative[] {
  return detectFatigueAll(creatives).map((f) => ({
    name: f.name,
    frequency: f.frequency,
    ctrThisWeek: f.ctrThisWeek,
    ctrLastWeek: f.ctrLastWeek,
    ctrDeclinePercent: f.ctrDeclinePercent,
    status: f.status,
    message: f.message,
  }))
}

// Generate fatigue_alert recommendations for non-healthy creatives. Idempotent per workspace.
export async function ensureFatigueAlerts(workspaceId: string): Promise<void> {
  const existing = await db
    .select({ id: schema.recommendations.id })
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.workspaceId, workspaceId),
        eq(schema.recommendations.type, 'fatigue_alert'),
      ),
    )
  if (existing.length > 0) return

  const alerts = detectFatigueAll(creatives).filter((f) => f.status !== 'healthy')
  if (alerts.length === 0) return

  await db.insert(schema.recommendations).values(
    alerts.map((f) => {
      const m = fatigueAlertRecommendation(f, workspaceId)
      return {
        workspaceId,
        type: m.type,
        sourceChannel: m.sourceChannel,
        targetChannel: m.targetChannel,
        title: m.title,
        body: m.body,
        actionLabel: m.actionLabel,
        impactScore: m.impactScore,
        effortScore: m.effortScore,
        urgencyScore: m.urgencyScore,
        compositeScore: m.compositeScore,
        status: m.status,
        rawData: m.rawData,
      }
    }),
  )

  // Real-time: one fatigue alert per first generation (idempotent — the early return above
  // keeps repeat polls silent). Carries the worst-offending creative name as the ad-set key.
  void publishEvent(workspaceId, {
    type: 'meta:fatigue_alert',
    workspaceId,
    adSetId: alerts[0]!.name,
  })
}
