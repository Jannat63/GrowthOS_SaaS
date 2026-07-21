import { afterAll, describe, expect, it } from 'vitest'
import { getKeywordRankings, getOrganicTraffic } from './seo.js'
import { getClickhouse } from './analytics.js'

// Integration: requires ClickHouse (dev stack up).
describe('seo rank tracking', () => {
  const ws = 'test-seo-ws'
  afterAll(async () => {
    await getClickhouse().command({
      query: 'ALTER TABLE keyword_rankings DELETE WHERE workspace_id = {ws:String}',
      query_params: { ws },
    })
    await getClickhouse().command({
      query: 'ALTER TABLE organic_traffic DELETE WHERE workspace_id = {ws:String}',
      query_params: { ws },
    })
  })

  it('seeds if empty and returns per-keyword rankings + summary (idempotent)', async () => {
    const first = await getKeywordRankings(ws)
    expect(first.keywords.length).toBeGreaterThan(0)
    expect(first.summary.tracked).toBe(first.keywords.length)
    // Each keyword has a series and a computed change.
    const k = first.keywords[0]!
    expect(k.series.length).toBeGreaterThan(1)
    expect(k.position).toBeGreaterThanOrEqual(1)
    expect(typeof k.change).toBe('number')
    // Sorted best-position-first.
    expect(first.keywords[0]!.position).toBeLessThanOrEqual(first.keywords.at(-1)!.position)

    // Idempotent: a second call doesn't multiply the seed.
    const second = await getKeywordRankings(ws)
    expect(second.keywords.length).toBe(first.keywords.length)
  }, 30000)

  it('seeds + aggregates organic traffic per page with a daily trend (idempotent)', async () => {
    const first = await getOrganicTraffic(ws)
    expect(first.pages.length).toBeGreaterThan(0)
    expect(first.summary.pages).toBe(first.pages.length)
    expect(first.summary.totalClicks).toBeGreaterThan(0)
    expect(first.trend.length).toBeGreaterThan(1)
    // Sorted by clicks desc.
    expect(first.pages[0]!.clicks).toBeGreaterThanOrEqual(first.pages.at(-1)!.clicks)
    // CTR is a percentage derived from clicks/impressions.
    const p = first.pages[0]!
    expect(p.ctr).toBeCloseTo(Math.round((p.clicks / p.impressions) * 1000) / 10, 1)

    const second = await getOrganicTraffic(ws)
    expect(second.pages.length).toBe(first.pages.length)
  }, 30000)
})
