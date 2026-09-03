import { afterAll, describe, expect, it } from 'vitest'
import { getCreativeScorecard } from './fatigue.js'
import { getClickhouse } from './analytics.js'

// Integration: requires ClickHouse. The scorecard reads the same per-workspace
// `creative_performance` rows as fatigue, so this exercises the real loader, the real max-date
// windowing, and the real seed — not a hand-built fixture.

describe('creative scorecard', () => {
  const ws = 'test-scorecard-ws'
  const customWs = 'test-scorecard-custom-ws'

  afterAll(async () => {
    for (const id of [ws, customWs]) {
      await getClickhouse().command({
        query: 'ALTER TABLE creative_performance DELETE WHERE workspace_id = {ws:String}',
        query_params: { ws: id },
      })
    }
  })

  it('grades the seeded account against its own median', async () => {
    const result = await getCreativeScorecard(ws)

    expect(result.creativeCount).toBeGreaterThan(0)
    expect(result.scores.length).toBe(result.creativeCount)
    // The seed carries enough creatives to produce a median rather than an insufficient-data punt.
    expect(result.medianCtr).not.toBeNull()
    expect(result.medianCtr!).toBeGreaterThan(0)
  })

  it('reads cpm from ClickHouse rather than leaving it null', async () => {
    // cpm was added to the loader's SELECT for this slice. If the column were dropped from the
    // query it would silently come back null and the panel would show nothing, with no other test
    // noticing — the band deliberately does not depend on it.
    const result = await getCreativeScorecard(ws)
    expect(result.scores.every((s) => s.cpm !== null)).toBe(true)
  })

  it('never returns a band without its reason and reference', async () => {
    const result = await getCreativeScorecard(ws)
    for (const s of result.scores) {
      expect(s.reason.length).toBeGreaterThan(0)
      expect(s.band).toBeTruthy()
      expect(s.driver).toBeTruthy()
    }
  })

  it('phrases verdicts relative to the account, not as absolute claims', async () => {
    // CTR is mid-funnel and reflects targeting as much as creative quality. Any graded band must
    // say what it was compared against.
    const result = await getCreativeScorecard(ws)
    const graded = result.scores.filter((s) => s.band !== 'insufficient-data')

    expect(graded.length).toBeGreaterThan(0)
    expect(graded.every((s) => /this account/.test(s.reason))).toBe(true)
  })

  it('orders the worst creatives first', async () => {
    const result = await getCreativeScorecard(ws)
    const rank = { underperforming: 0, 'insufficient-data': 1, average: 2, strong: 3 } as const

    for (let i = 1; i < result.scores.length; i++) {
      expect(rank[result.scores[i]!.band]).toBeGreaterThanOrEqual(rank[result.scores[i - 1]!.band])
    }
  })

  it('withholds a verdict from a thin account instead of inventing one', async () => {
    // Two creatives is far below the median threshold. Inserted directly so the seed does not run.
    await getClickhouse().insert({
      table: 'creative_performance',
      values: [
        {
          workspace_id: customWs,
          creative_id: 'thin-1',
          creative_name: 'Thin One',
          platform: 'meta_ads',
          date: '2026-06-20',
          ctr: 2.5,
          cpm: 10,
          frequency: 1.2,
          fatigue_score: 0,
        },
        {
          workspace_id: customWs,
          creative_id: 'thin-2',
          creative_name: 'Thin Two',
          platform: 'meta_ads',
          date: '2026-06-20',
          ctr: 1.1,
          cpm: 10,
          frequency: 1.4,
          fatigue_score: 0,
        },
      ],
      format: 'JSONEachRow',
    })

    const result = await getCreativeScorecard(customWs)

    expect(result.creativeCount).toBe(2)
    expect(result.medianCtr).toBeNull()
    expect(result.scores.every((s) => s.band === 'insufficient-data')).toBe(true)
    // The observed number is still reported — only the verdict is withheld.
    expect(result.scores.every((s) => s.ctr > 0)).toBe(true)
  })
})
