import { describe, it, expect } from 'vitest'
import { SEED_DAYS, SEED_LAST_DAY, seedDates } from './seed-window.js'

/**
 * The largest window any dashboard offers — `RANGE_OPTIONS` in apps/web/lib/stores/range.ts.
 * Kept as a literal rather than imported: apps/api does not depend on apps/web, and the point of
 * the test is to fail loudly if the two drift apart.
 */
const LARGEST_DASHBOARD_RANGE = 90

describe('seed window', () => {
  it('covers at least two of the largest dashboard range', () => {
    // This is the invariant that was broken in production and cost every trend indicator in the
    // product. The Growth Hub compares a window against the preceding one, so a seed shorter than
    // 2x the selected range leaves the comparison window empty, `previous` at 0, and every
    // `deltaPct` null — with no error anywhere, just tiles that render no change.
    expect(SEED_DAYS).toBeGreaterThanOrEqual(LARGEST_DASHBOARD_RANGE * 2)
  })

  it('produces SEED_DAYS consecutive days ending on SEED_LAST_DAY', () => {
    const dates = seedDates()
    expect(dates).toHaveLength(SEED_DAYS)
    expect(dates.at(-1)).toBe(SEED_LAST_DAY)

    // A gap would silently shorten whichever window it fell in.
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(`${dates[i - 1]}T00:00:00Z`).getTime()
      const cur = new Date(`${dates[i]}T00:00:00Z`).getTime()
      expect(cur - prev).toBe(86_400_000)
    }
  })

  it('anchors the window at its end, so widening it adds history rather than moving "now"', () => {
    // Everything downstream keys off max(date). If extending the seed moved the last day forward,
    // every seeded figure in the product would shift with it.
    expect(seedDates().at(-1)).toBe(SEED_LAST_DAY)
  })
})
