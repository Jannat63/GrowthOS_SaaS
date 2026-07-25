import { describe, expect, it } from 'vitest'
import type { WeeklyReport } from '@growthos/logic'
import type { WhiteLabelConfig } from '@growthos/types'
import { renderReportHtml } from './pdf-report.js'

const baseReport: WeeklyReport = {
  weekStart: '2026-07-20',
  summary: 'Blended ROAS held steady at 3.2x this week.',
  blendedRoas: 3.2,
  totalRevenue: 42000,
  totalSpend: 13125,
  topOpportunities: [{ title: 'Launch paid for "standing desk"', body: 'Ranking #4 organically.' }],
  channelBreakdown: [
    { channel: 'google_ads', spend: 8000, revenue: 26000, roas: 3.25 },
    { channel: 'meta_ads', spend: 5125, revenue: 16000, roas: 3.12 },
  ],
  budgetReallocation: {
    fromChannel: 'meta_ads',
    toChannel: 'google_ads',
    amount: 750,
    reason: 'Google Ads ROAS is meaningfully higher this week.',
  },
}

describe('renderReportHtml', () => {
  it('falls back to the default GrowthOS brand when no white-label config is set', () => {
    const html = renderReportHtml('Acme Co', baseReport, {})
    expect(html).toContain('GrowthOS')
    expect(html).toContain('#4f46e5') // default primary color
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

  it('includes the budget reallocation callout only when one exists', () => {
    const withRealloc = renderReportHtml('Acme Co', baseReport, {})
    expect(withRealloc).toContain('Suggested budget move')

    const withoutRealloc = renderReportHtml('Acme Co', { ...baseReport, budgetReallocation: null }, {})
    expect(withoutRealloc).not.toContain('Suggested budget move')
  })

  it('renders a friendly empty state when there are no channels or opportunities', () => {
    const empty: WeeklyReport = { ...baseReport, channelBreakdown: [], topOpportunities: [], budgetReallocation: null }
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
})
