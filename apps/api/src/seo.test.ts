import { afterAll, describe, expect, it } from 'vitest'
import { getKeywordRankings } from './seo.js'
import { getClickhouse } from './analytics.js'

// Integration: requires ClickHouse (dev stack up).
describe('seo rank tracking', () => {
  const ws = 'test-seo-ws'
  afterAll(async () => {
    await getClickhouse().command({
      query: 'ALTER TABLE keyword_rankings DELETE WHERE workspace_id = {ws:String}',
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
})
