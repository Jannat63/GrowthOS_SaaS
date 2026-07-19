import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { getWeeklyReport } from './intelligence.js'
import { getClickhouse } from './analytics.js'

// Integration: requires Neon + ClickHouse (dev stack up).
describe('weekly intelligence report', () => {
  const ws = 'test-intel-ws'
  afterAll(async () => {
    await db.delete(schema.intelligenceReports).where(eq(schema.intelligenceReports.workspaceId, ws))
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    await getClickhouse().command({
      query: 'ALTER TABLE ad_performance DELETE WHERE workspace_id = {ws:String}',
      query_params: { ws },
    })
  })

  it('builds + persists a report with channel breakdown and top opportunities', async () => {
    const report = await getWeeklyReport(ws)
    expect(report.channelBreakdown.length).toBeGreaterThan(0)
    expect(report.blendedRoas).toBeGreaterThan(0)
    expect(report.summary).toContain('blended ROAS')

    const [row] = await db
      .select()
      .from(schema.intelligenceReports)
      .where(eq(schema.intelligenceReports.workspaceId, ws))
    expect(row).toBeDefined()

    // Idempotent per week — a second call updates the same row.
    await getWeeklyReport(ws)
    const rows = await db
      .select()
      .from(schema.intelligenceReports)
      .where(eq(schema.intelligenceReports.workspaceId, ws))
    expect(rows).toHaveLength(1)
  }, 30000)
})
