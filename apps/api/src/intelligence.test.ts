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
    expect(report.blendedMer.value).toBeGreaterThan(0)
    expect(report.headline).toContain('Blended MER')

    // The window is anchored to the newest day with DATA, not the calendar week the report is
    // filed under. A seeded workspace sits weeks in the past, so these must be allowed to differ.
    expect(report.period).not.toBeNull()
    expect(report.period!.to >= report.period!.from).toBe(true)

    // Blended MER counts organic; paid ROAS does not. Reporting one under the other's name is
    // what made this page disagree with the Growth Hub about the same week.
    expect(report.blendedMer.value).toBeGreaterThan(report.paidRoas.value)
    const organic = report.channelBreakdown.find((c) => c.channel === 'organic')
    expect(organic?.roas).toBeNull()

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
