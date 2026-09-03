import { AppError } from './errors.js'

/**
 * Core Web Vitals (SEO extras, real feature) via Google's PageSpeed Insights API v5.
 *
 * Genuinely free — Google's own API, no paid tier involved. `GOOGLE_PAGESPEED_API_KEY` is
 * optional: PageSpeed Insights accepts keyless requests at a lower per-IP rate limit, so this
 * works immediately with zero setup. Setting the env var (a free Google Cloud API key, no billing
 * account required) just raises the quota — see
 * https://developers.google.com/speed/docs/insights/v5/get-started.
 *
 * A direct, synchronous call — unlike site_audit, this doesn't need a background job (PageSpeed
 * responds in a few seconds for a single URL, not the "crawl up to 50 pages" scale a real audit
 * runs at).
 */

const PAGESPEED_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

export interface CoreWebVitalsResult {
  url: string
  strategy: 'mobile' | 'desktop'
  performanceScore: number | null // 0-100, Lighthouse's overall performance score
  lcpMs: number | null // Largest Contentful Paint
  clsScore: number | null // Cumulative Layout Shift
  inpMs: number | null // Interaction to Next Paint (field data; may be unavailable for low-traffic sites)
  ttfbMs: number | null // Time to First Byte
  fetchedAt: string
}

interface PageSpeedApiResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } }
    audits?: Record<string, { numericValue?: number }>
  }
  loadingExperience?: {
    metrics?: Record<string, { percentile?: number }>
  }
}

export async function getCoreWebVitals(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile',
): Promise<CoreWebVitalsResult> {
  const params = new URLSearchParams({ url, strategy, category: 'performance' })
  if (process.env.GOOGLE_PAGESPEED_API_KEY) {
    params.set('key', process.env.GOOGLE_PAGESPEED_API_KEY)
  }

  let res: Response
  try {
    res = await fetch(`${PAGESPEED_ENDPOINT}?${params.toString()}`)
  } catch {
    throw new AppError('UPSTREAM_ERROR', 'Could not reach Google PageSpeed Insights right now.')
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new AppError(
        'RATE_LIMITED',
        'Google PageSpeed Insights rate-limited this request. Add a free GOOGLE_PAGESPEED_API_KEY for a higher quota, or try again shortly.',
      )
    }
    if (res.status === 400) {
      throw new AppError('VALIDATION_ERROR', `PageSpeed Insights couldn't analyze this URL — check that it's correct and publicly reachable.`)
    }
    throw new AppError('UPSTREAM_ERROR', `PageSpeed Insights request failed (${res.status}).`)
  }

  const body = (await res.json()) as PageSpeedApiResponse
  const audits = body.lighthouseResult?.audits ?? {}
  // Field data (real Chrome UX Report visitor data) is preferred where available; lab data
  // (Lighthouse's own simulated run) is the fallback every URL has, even brand-new/low-traffic ones.
  const fieldMetrics = body.loadingExperience?.metrics ?? {}

  return {
    url,
    strategy,
    performanceScore:
      body.lighthouseResult?.categories?.performance?.score != null
        ? Math.round(body.lighthouseResult.categories.performance.score * 100)
        : null,
    lcpMs: fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? audits['largest-contentful-paint']?.numericValue ?? null,
    clsScore:
      fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null
        ? fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
        : (audits['cumulative-layout-shift']?.numericValue ?? null),
    inpMs: fieldMetrics.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
    ttfbMs: audits['server-response-time']?.numericValue ?? null,
    fetchedAt: new Date().toISOString(),
  }
}
