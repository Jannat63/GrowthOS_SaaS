import { afterAll, describe, expect, it } from 'vitest'
import { ensureAdPerformanceSeed, getMerTrend, getClickhouse } from './analytics.js'

// Integration: requires local ClickHouse (docker compose up -d).
describe('blended MER', () => {
  const ws = 'test-mer-ws'
  afterAll(async () => {
    await getClickhouse().command({
      query: `ALTER TABLE ad_performance DELETE WHERE workspace_id = {ws:String}`,
      query_params: { ws },
    })
  })

  it('seeds ad_performance if empty (idempotent) and builds a MER trend', async () => {
    await getClickhouse().command({
      query: `ALTER TABLE ad_performance DELETE WHERE workspace_id = {ws:String}`,
      query_params: { ws },
    })
    await ensureAdPerformanceSeed(ws)
    const a = await getMerTrend(ws, 30)
    expect(a.trend.length).toBeGreaterThan(0)
    expect(a.summary.blendedMER).toBeGreaterThan(0)
    expect(a.channelBreakdown.googleAdsSpend).toBeGreaterThan(0)

    await ensureAdPerformanceSeed(ws) // idempotent — should not double the rows
    const b = await getMerTrend(ws, 30)
    expect(b.trend.length).toBe(a.trend.length)
  })
})
