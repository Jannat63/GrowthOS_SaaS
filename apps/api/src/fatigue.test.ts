import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { ensureFatigueAlerts, getFatigueResults } from './fatigue.js'
import { getClickhouse } from './analytics.js'

// Integration: requires Neon + ClickHouse. Fatigue reads per-workspace rows from
// `creative_performance` rather than scoring a shared fixture — see the module header and
// docs/AUDIT-2026-08-13-codebase.md #6.

describe('creative fatigue', () => {
  const ws = 'test-fatigue-ws'
  const otherWs = 'test-fatigue-ws-other'

  afterAll(async () => {
    for (const id of [ws, otherWs]) {
      await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, id))
      await getClickhouse().command({
        query: 'ALTER TABLE creative_performance DELETE WHERE workspace_id = {ws:String}',
        query_params: { ws: id },
      })
    }
  })

  it('scores creatives and flags fatigue', async () => {
    const results = await getFatigueResults(ws)
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.status === 'fatigued')).toBe(true)
  })

  it('derives the week-over-week decline from stored rows, not a stored verdict', async () => {
    const results = await getFatigueResults(ws)
    const fatigued = results.find((r) => r.status === 'fatigued')

    // The engine did the judging: a fatigued creative must show a real CTR drop between the two
    // windows, which only holds if the seeded daily rows were read and aggregated correctly.
    expect(fatigued).toBeDefined()
    expect(fatigued!.ctrThisWeek).toBeLessThan(fatigued!.ctrLastWeek)
    expect(fatigued!.ctrDeclinePercent).toBeGreaterThan(0)
  })

  it('is workspace-scoped — the seed belongs to the workspace that asked for it', async () => {
    await getFatigueResults(ws)

    const rs = await getClickhouse().query({
      query:
        'SELECT count() AS c FROM creative_performance WHERE workspace_id = {ws:String}',
      query_params: { ws: otherWs },
      format: 'JSONEachRow',
    })
    const [before] = (await rs.json()) as { c: string }[]
    expect(Number(before!.c)).toBe(0)

    // A second workspace gets its own rows rather than reading the first one's.
    const otherResults = await getFatigueResults(otherWs)
    expect(otherResults.length).toBeGreaterThan(0)
  })

  it('generates fatigue_alert recs for non-healthy creatives, idempotently', async () => {
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

    await ensureFatigueAlerts(ws)
    const recs1 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    const nonHealthy = (await getFatigueResults(ws)).filter((r) => r.status !== 'healthy').length
    expect(recs1.length).toBe(nonHealthy)
    expect(recs1.every((r) => r.type === 'fatigue_alert')).toBe(true)

    await ensureFatigueAlerts(ws)
    const recs2 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    expect(recs2.length).toBe(recs1.length)
  })
})
