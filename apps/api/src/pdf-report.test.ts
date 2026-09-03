import { describe, expect, it } from 'vitest'
import type { ReportChannel, WeeklyReport } from '@growthos/logic'
import type { WhiteLabelConfig } from '@growthos/types'
import { renderReportHtml } from './pdf-report.js'

const channel = (over: Partial<ReportChannel> & Pick<ReportChannel, 'channel'>): ReportChannel => ({
  spend: 0,
  revenue: 0,
  roas: null,
  cpa: null,
  revenueShare: 0,
  previous: null,
  roasDelta: null,
  ...over,
})

const baseReport: WeeklyReport = {
  weekStart: '2026-07-20',
  period: { from: '2026-07-14', to: '2026-07-20' },
  headline: 'Blended MER held at 3.20x on $13,125 of ad spend.',
  summary: 'Google Ads led at 3.25x ROAS; Meta Ads returned 3.12x.',
  blendedMer: { value: 3.2, previous: 3.0, deltaPct: 7 },
  paidRoas: { value: 3.2, previous: 3.0, deltaPct: 7 },
  revenue: { value: 42000, previous: 39000, deltaPct: 8 },
  adSpend: { value: 13125, previous: 13000, deltaPct: 1 },
  topOpportunities: [
    {
      title: 'Launch paid for "standing desk"',
      body: 'Ranking #4 organically.',
      sourceChannel: 'organic',
      targetChannel: 'google_ads',
      priority: 87,
    },
  ],
  openOpportunities: 1,
  channelBreakdown: [
    channel({ channel: 'google_ads', spend: 8000, revenue: 26000, roas: 3.25, cpa: 40, conversions: 200 }),
    channel({ channel: 'meta_ads', spend: 5125, revenue: 16000, roas: 3.12, cpa: 51, conversions: 100 }),
  ],
  budgetReallocation: {
    fromChannel: 'meta_ads',
    toChannel: 'google_ads',
    amount: 750,
    reason: 'Google Ads ROAS is meaningfully higher this week.',
    basis: '15% of the Meta Ads budget for this period.',
  },
}

describe('renderReportHtml', () => {
  it('falls back to the default GrowthOS brand when no white-label config is set', () => {
    const html = renderReportHtml('Acme Co', baseReport, {})
    expect(html).toContain('GrowthOS')
    expect(html).toContain('#ce4218') // default primary color (GrowthOS ember)
    expect(html).toContain('logo-fallback') // no logoUrl → text fallback, not an <img>
  })

  it('applies the agency name, logo, and primary color when set', () => {
    const branding: WhiteLabelConfig = {
      agencyName: 'Blue Harbor Growth',
      logoUrl: 'https://cdn.example/logo.png',
      primaryColor: '#22c55e',
    }
    const html = renderReportHtml('Acme Co', baseReport, branding)
    expect(html).toContain('Blue Harbor Growth')
    expect(html).toContain('https://cdn.example/logo.png')
    expect(html).toContain('#22c55e')
    expect(html).not.toContain('logo-fallback"><') // real logo present, no fallback div rendered
  })

  it('escapes HTML in every user-controlled field (agency name, workspace name, opportunity text)', () => {
    const branding: WhiteLabelConfig = { agencyName: '<script>alert(1)</script>' }
    const report: WeeklyReport = {
      ...baseReport,
      topOpportunities: [{ title: '<img src=x onerror=alert(1)>', body: 'normal body' }],
    }
    const html = renderReportHtml('<b>Acme</b>', report, branding)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<b>Acme</b>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('includes the budget reallocation callout, with the rule behind the amount', () => {
    const withRealloc = renderReportHtml('Acme Co', baseReport, {})
    expect(withRealloc).toContain('Suggested budget move')
    // The dollar figure is a fixed fraction of one channel's spend; without the rule it appears
    // from nowhere.
    expect(withRealloc).toContain('15% of the Meta Ads budget')

    const withoutRealloc = renderReportHtml('Acme Co', { ...baseReport, budgetReallocation: null }, {})
    expect(withoutRealloc).not.toContain('Suggested budget move')
  })

  it('leads with the headline and prints the measured window, not the calendar week', () => {
    const html = renderReportHtml('Acme Co', baseReport, {})
    expect(html).toContain('Blended MER held at 3.20x')
    // The report is FILED under weekStart but MEASURED over period — printing the former above
    // figures drawn from the latter is what made the old header wrong.
    expect(html).toContain('Jul 14, 2026')
    expect(html).toContain('Jul 20, 2026')
  })

  it('reports blended MER and paid ROAS as separate figures', () => {
    const html = renderReportHtml('Acme Co', baseReport, {})
    expect(html).toContain('Blended MER')
    expect(html).toContain('Paid ROAS')
  })

  it('shows week-over-week movement on every headline figure', () => {
    const html = renderReportHtml('Acme Co', baseReport, {})
    expect(html).toContain('+8% vs prior week')
    const noPrior: WeeklyReport = {
      ...baseReport,
      revenue: { value: 42000, previous: null, deltaPct: null },
      adSpend: { value: 13125, previous: null, deltaPct: null },
      blendedMer: { value: 3.2, previous: null, deltaPct: null },
      paidRoas: { value: 3.2, previous: null, deltaPct: null },
    }
    expect(renderReportHtml('Acme Co', noPrior, {})).toContain('No prior period')
  })

  it('renders a channel with no ad spend as an estimate, never as zeroes', () => {
    const html = renderReportHtml(
      'Acme Co',
      {
        ...baseReport,
        channelBreakdown: [
          ...baseReport.channelBreakdown,
          channel({ channel: 'organic', revenue: 6000, clicks: 1204, paid: false, modelled: true }),
        ],
      },
      {},
    )
    expect(html).toContain('Organic Search')
    expect(html).toContain('1,204 clicks')
    expect(html).toContain('estimated')
    // "$0" spend and "0.00x ROAS" would rank the cheapest channel a business has as its worst.
    expect(html).not.toContain('0.00x')
  })

  it('names the bridge behind an opportunity and counts the ones it left out', () => {
    const html = renderReportHtml('Acme Co', { ...baseReport, openOpportunities: 11 }, {})
    expect(html).toContain('Organic Search &rarr; Google Ads')
    expect(html).toContain('10 further recommendations open')
  })

  it('renders a friendly empty state when there are no channels or opportunities', () => {
    const empty: WeeklyReport = {
      ...baseReport,
      channelBreakdown: [],
      topOpportunities: [],
      openOpportunities: 0,
      budgetReallocation: null,
    }
    const html = renderReportHtml('Acme Co', empty, {})
    expect(html).toContain('No channel data for this period.')
    expect(html).toContain('No open recommendations this week.')
  })

  it('formats currency and ROAS values readably', () => {
    const html = renderReportHtml('Acme Co', baseReport, {})
    expect(html).toContain('$42,000')
    expect(html).toContain('$13,125')
    expect(html).toContain('3.20x')
  })

  it('keeps channel slugs out of the document entirely', () => {
    const html = renderReportHtml('Acme Co', baseReport, {})
    expect(html).not.toContain('google_ads')
    expect(html).not.toContain('meta_ads')
  })
})
