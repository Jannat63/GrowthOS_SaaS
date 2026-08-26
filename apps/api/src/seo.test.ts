import { afterAll, describe, expect, it } from 'vitest'
import { getKeywordClusters, getKeywordRankings, getOrganicTraffic } from './seo.js'
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

  it('clusters the tracked keywords over the same data the rank tracker reads', async () => {
    const rankings = await getKeywordRankings(ws)
    const { clusters, summary } = await getKeywordClusters(ws)

    // Every tracked keyword lands in exactly one cluster — no drops, no duplicates. This is the
    // check that catches the adapter and the rank tracker disagreeing about the keyword set.
    const clustered = clusters.flatMap((c) => c.keywords.map((k) => k.keyword))
    expect(clustered.sort()).toEqual(rankings.keywords.map((k) => k.keyword).sort())
    expect(summary.keywords).toBe(rankings.keywords.length)

    // Positions are carried through from the rankings, not recomputed or defaulted to 0.
    const positions = new Map(rankings.keywords.map((k) => [k.keyword, k.position]))
    for (const cluster of clusters) {
      for (const k of cluster.keywords) expect(k.position).toBe(positions.get(k.keyword))
    }

    // Names are unique — two clusters sharing a label is unreadable in the UI and was a real defect
    // on this exact seed set ("Office" twice) before naming was de-duplicated.
    const names = clusters.map((c) => c.clusterName)
    expect(new Set(names).size).toBe(names.length)

    // Lexical only: nothing here has seen a SERP, so nothing may claim verified intent.
    expect(clusters.every((c) => c.intentVerified)).toBe(false)

    // Biggest cluster first, and the summary agrees with the clusters it describes.
    expect(summary.largestCluster).toBe(clusters[0]!.keywords.length)
    expect(summary.clusters).toBe(clusters.length)
    expect(summary.singletons).toBe(clusters.filter((c) => c.keywords.length === 1).length)
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
