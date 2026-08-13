import { describe, it, expect, vi, beforeEach } from 'vitest'

// Unit test over the aggregate -> response mapping, with ClickHouse stubbed. The SQL itself (the
// max(date)-relative windowing) needs a live ClickHouse and is exercised by running the endpoint
// against the dev stack; what's covered here is the arithmetic that sits between the query and the
// wire, which is where the mistakes that survive a code review actually live: the revenue scaling
// factor, the divide-by-zero guards on the simulator baseline, and the sessions proxy.

const query = vi.fn()
const ensureAdPerformanceSeed = vi.fn()
const ensureOrganicTrafficSeed = vi.fn()

vi.mock('./analytics.js', () => ({
  getClickhouse: () => ({ query }),
  ensureAdPerformanceSeed,
  REVENUE_FACTOR: 2.2,
}))
vi.mock('./seo.js', () => ({ ensureOrganicTrafficSeed }))

const { getGrowthHub } = await import('./growth-hub.js')

/** Route each of the two queries to its own fixture by looking at which table it hits. */
function stubClickhouse(ads: Record<string, number>, organic: Record<string, number>) {
  query.mockImplementation(async ({ query: sql }: { query: string }) => ({
    json: async () => [sql.includes('organic_traffic') ? organic : ads],
  }))
}

const ADS = {
  googleSpendCur: 6200.456,
  googleSpendPrev: 5840,
  metaSpendCur: 4980,
  metaSpendPrev: 4690,
  convValueCur: 21950,
  convValuePrev: 18509,
  conversionsCur: 6142,
  conversionsPrev: 4933,
  googleConversionsCur: 1842,
  metaConversionsCur: 2116,
  clicksCur: 121200,
}
const ORGANIC = { clicksCur: 128400, clicksPrev: 111000 }

beforeEach(() => {
  query.mockReset()
  ensureAdPerformanceSeed.mockReset()
  ensureOrganicTrafficSeed.mockReset()
})

describe('getGrowthHub', () => {
  it('seeds both data sources before reading, so a brand-new workspace is never blank', async () => {
    stubClickhouse(ADS, ORGANIC)
    await getGrowthHub('ws-1')
    expect(ensureAdPerformanceSeed).toHaveBeenCalledWith('ws-1')
    expect(ensureOrganicTrafficSeed).toHaveBeenCalledWith('ws-1')
  })

  it('scales ad conversion value into blended revenue by the shared factor', async () => {
    stubClickhouse(ADS, ORGANIC)
    const res = await getGrowthHub('ws-1')
    expect(res.metrics.revenue.current).toBe(Math.round(21950 * 2.2))
    expect(res.metrics.revenue.previous).toBe(Math.round(18509 * 2.2))
  })

  it('reports spend per platform, rounded to cents, with its previous window', async () => {
    stubClickhouse(ADS, ORGANIC)
    const res = await getGrowthHub('ws-1')
    expect(res.metrics.googleSpend).toEqual({ current: 6200.46, previous: 5840 })
    expect(res.metrics.metaSpend).toEqual({ current: 4980, previous: 4690 })
  })

  it('derives the simulator baseline from paid + organic clicks as the sessions proxy', async () => {
    stubClickhouse(ADS, ORGANIC)
    const { baseline } = await getGrowthHub('ws-1')
    expect(baseline.currentSessions).toBe(121200 + 128400)
    expect(baseline.currentConversionRate).toBeCloseTo(6142 / 249600, 6)
    // AOV is raw order value — deliberately NOT multiplied by the blended-revenue factor.
    expect(baseline.currentAOV).toBe(3.57)
  })

  it('returns a zeroed baseline instead of NaN for a workspace with no traffic', async () => {
    stubClickhouse(
      { ...ADS, conversionsCur: 0, convValueCur: 0, clicksCur: 0 },
      { clicksCur: 0, clicksPrev: 0 },
    )
    const { baseline } = await getGrowthHub('ws-empty')
    expect(baseline).toEqual({ currentConversionRate: 0, currentAOV: 0, currentSessions: 0 })
  })

  it('falls back to zeroes when ClickHouse returns no row at all', async () => {
    query.mockImplementation(async () => ({ json: async () => [] }))
    const res = await getGrowthHub('ws-none')
    expect(res.metrics.revenue).toEqual({ current: 0, previous: 0 })
    expect(res.channels.google.conversions).toBe(0)
  })

  it('passes the requested window length through to the response', async () => {
    stubClickhouse(ADS, ORGANIC)
    expect((await getGrowthHub('ws-1', 7)).windowDays).toBe(7)
    expect((await getGrowthHub('ws-1')).windowDays).toBe(30)
  })
})
