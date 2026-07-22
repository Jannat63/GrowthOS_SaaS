import { describe, expect, it } from 'vitest'
import type { WeeklyReport } from '@growthos/logic'
import { renderWeeklyReportPdf } from './weekly-pdf.js'

// Pure render — no DB/infra. Asserts we emit a well-formed PDF for both the default
// GrowthOS brand and an agency white-label config.
const report: WeeklyReport = {
  weekStart: '2026-07-15',
  summary: 'Blended ROAS held at 1.8x this week. Meta Ads underperformed Google Ads.',
  blendedRoas: 1.8,
  totalRevenue: 5110,
  totalSpend: 2840,
  topOpportunities: [
    { title: 'Create SEO content for "standing desk"', body: 'Paid-proven, no organic coverage.' },
    { title: 'Amplify "ergonomic chair" with Meta', body: 'Proven organic demand to scale with paid.' },
  ],
  channelBreakdown: [
    { channel: 'google_ads', spend: 1365, revenue: 3010, roas: 2.2 },
    { channel: 'meta_ads', spend: 1475, revenue: 2100, roas: 1.42 },
  ],
  budgetReallocation: {
    fromChannel: 'meta_ads',
    toChannel: 'google_ads',
    amount: 221,
    reason: 'Google Ads returns 2.2x vs Meta 1.42x — shift 15% of Meta spend.',
  },
}

function isPdf(buf: Buffer): boolean {
  return buf.length > 1000 && buf.subarray(0, 5).toString('latin1') === '%PDF-'
}

describe('renderWeeklyReportPdf', () => {
  it('renders a valid PDF with the default brand when no config is given', async () => {
    const buf = await renderWeeklyReportPdf(report, null)
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(isPdf(buf)).toBe(true)
  })

  it('renders a valid PDF with an agency white-label config', async () => {
    const buf = await renderWeeklyReportPdf(report, {
      agencyName: 'Acme Growth Co.',
      primaryColor: '#0f766e',
      logoUrl: null,
    })
    expect(isPdf(buf)).toBe(true)
  })

  it('renders when the report has no budget move and no opportunities', async () => {
    const buf = await renderWeeklyReportPdf(
      { ...report, budgetReallocation: null, topOpportunities: [], channelBreakdown: [] },
      null,
    )
    expect(isPdf(buf)).toBe(true)
  })
})
