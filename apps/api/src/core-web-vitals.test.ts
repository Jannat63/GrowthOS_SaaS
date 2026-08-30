import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCoreWebVitals } from './core-web-vitals.js'
import { AppError } from './errors.js'

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => body,
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.GOOGLE_PAGESPEED_API_KEY
})

describe('getCoreWebVitals', () => {
  it('prefers real field data (CrUX) over lab data when both are present', async () => {
    mockFetchOnce({
      lighthouseResult: {
        categories: { performance: { score: 0.87 } },
        audits: {
          'largest-contentful-paint': { numericValue: 4000 },
          'cumulative-layout-shift': { numericValue: 0.3 },
          'server-response-time': { numericValue: 200 },
        },
      },
      loadingExperience: {
        metrics: {
          LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2100 },
          CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 },
          INTERACTION_TO_NEXT_PAINT: { percentile: 180 },
        },
      },
    })

    const result = await getCoreWebVitals('https://example.com', 'mobile')

    expect(result.performanceScore).toBe(87)
    expect(result.lcpMs).toBe(2100) // real field data, not the 4000ms lab value
    expect(result.clsScore).toBeCloseTo(0.05) // percentile 5 -> 0.05
    expect(result.inpMs).toBe(180)
    expect(result.ttfbMs).toBe(200) // no field equivalent tracked — lab value used
  })

  it('falls back to lab data when field data is unavailable (e.g. a low-traffic site)', async () => {
    mockFetchOnce({
      lighthouseResult: {
        categories: { performance: { score: 0.5 } },
        audits: {
          'largest-contentful-paint': { numericValue: 3500 },
          'cumulative-layout-shift': { numericValue: 0.12 },
        },
      },
      // no loadingExperience at all — a real, common case for low-traffic sites
    })

    const result = await getCoreWebVitals('https://example.com')

    expect(result.lcpMs).toBe(3500)
    expect(result.clsScore).toBe(0.12)
    expect(result.inpMs).toBeNull() // no CrUX data and no lab equivalent for INP
  })

  it('includes the API key in the request only when configured', async () => {
    process.env.GOOGLE_PAGESPEED_API_KEY = 'test-key-123'
    mockFetchOnce({ lighthouseResult: { categories: {}, audits: {} } })

    await getCoreWebVitals('https://example.com')

    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0]?.[0]).toContain('key=test-key-123')
  })

  it('omits the key entirely when not configured (keyless requests are supported)', async () => {
    mockFetchOnce({ lighthouseResult: { categories: {}, audits: {} } })
    await getCoreWebVitals('https://example.com')
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0]?.[0]).not.toContain('key=')
  })

  it('surfaces a rate-limit as a clear, actionable AppError', async () => {
    mockFetchOnce({}, { ok: false, status: 429 })
    try {
      await getCoreWebVitals('https://example.com')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      expect((err as AppError).code).toBe('RATE_LIMITED')
      expect((err as AppError).message).toContain('GOOGLE_PAGESPEED_API_KEY')
    }
  })

  it('surfaces an unreachable-network failure as UPSTREAM_ERROR, not a raw crash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    await expect(getCoreWebVitals('https://example.com')).rejects.toThrow(AppError)
  })
})
