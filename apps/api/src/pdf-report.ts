import type { WeeklyReport } from '@growthos/logic'
import type { WhiteLabelConfig } from '@growthos/types'

/**
 * White-labeled PDF report (M3 P3.5 Slice C2). This module is the pure HTML-templating half —
 * no Puppeteer, no database, no network. It renders the same `WeeklyReport` the Intelligence page
 * already shows on-screen (see intelligence.ts `getWeeklyReport`) into a standalone, self-styled
 * HTML document, with the workspace's `WhiteLabelConfig` applied (falls back to the default
 * GrowthOS brand when a field is unset — see the type's own doc comment). Deliberately kept
 * separate from `pdf-report-generate.ts` (which drives Puppeteer) so this templating logic is
 * testable without a headless browser, the same split used for schema-markup.ts.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/** Pure — builds the full standalone HTML document that gets rendered to PDF. */
export function renderReportHtml(
  workspaceName: string,
  report: WeeklyReport,
  branding: WhiteLabelConfig,
): string {
  const brandName = branding.agencyName?.trim() || 'GrowthOS'
  const primaryColor = branding.primaryColor?.trim() || '#4f46e5'
  const logoHtml = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(brandName)}" class="logo" />`
    : `<div class="logo-fallback">${escapeHtml(brandName)}</div>`

  const channelRows = report.channelBreakdown
    .map(
      (c) => `<tr>
        <td>${escapeHtml(c.channel)}</td>
        <td>${money(c.spend)}</td>
        <td>${money(c.revenue)}</td>
        <td>${c.roas.toFixed(2)}x</td>
      </tr>`,
    )
    .join('')

  const opportunityItems = report.topOpportunities
    .map((o) => `<li><strong>${escapeHtml(o.title)}</strong><p>${escapeHtml(o.body)}</p></li>`)
    .join('')

  const reallocationBlock = report.budgetReallocation
    ? `<div class="callout">
        <strong>Suggested budget move:</strong> Shift ${money(report.budgetReallocation.amount)} from
        ${escapeHtml(report.budgetReallocation.fromChannel)} to ${escapeHtml(report.budgetReallocation.toChannel)}.
        <p>${escapeHtml(report.budgetReallocation.reason)}</p>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  :root { --primary: ${primaryColor}; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 40px; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid var(--primary); padding-bottom: 16px; margin-bottom: 24px; }
  .logo { max-height: 40px; }
  .logo-fallback { font-size: 20px; font-weight: 700; color: var(--primary); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; }
  .period { color: #666; font-size: 13px; }
  .summary { background: #f7f7f9; border-left: 4px solid var(--primary); padding: 14px 18px; margin: 20px 0; font-size: 14px; }
  .stat-row { display: flex; gap: 16px; margin: 20px 0; }
  .stat { flex: 1; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; }
  .stat .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
  .stat .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #eee; }
  th { color: #888; font-weight: 600; font-size: 11px; text-transform: uppercase; }
  .callout { background: #fff8ec; border: 1px solid #f0dca6; border-radius: 8px; padding: 14px 18px; margin: 16px 0; font-size: 13px; }
  ul.opps { list-style: none; padding: 0; margin: 16px 0; }
  ul.opps li { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; }
  ul.opps li p { margin: 4px 0 0; color: #555; font-size: 13px; }
  footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
</style>
</head>
<body>
  <header>
    ${logoHtml}
    <div class="period">Week of ${escapeHtml(report.weekStart)}</div>
  </header>
  <h1>${escapeHtml(workspaceName)} — Weekly Growth Report</h1>
  <div class="summary">${escapeHtml(report.summary)}</div>
  <div class="stat-row">
    <div class="stat"><div class="label">Blended ROAS</div><div class="value">${report.blendedRoas.toFixed(2)}x</div></div>
    <div class="stat"><div class="label">Total revenue</div><div class="value">${money(report.totalRevenue)}</div></div>
    <div class="stat"><div class="label">Total spend</div><div class="value">${money(report.totalSpend)}</div></div>
  </div>
  ${reallocationBlock}
  <h2>Channel breakdown</h2>
  <table>
    <thead><tr><th>Channel</th><th>Spend</th><th>Revenue</th><th>ROAS</th></tr></thead>
    <tbody>${channelRows || '<tr><td colspan="4">No channel data for this period.</td></tr>'}</tbody>
  </table>
  <h2>Top opportunities</h2>
  <ul class="opps">${opportunityItems || '<li>No open recommendations this week.</li>'}</ul>
  <footer>Generated by ${escapeHtml(brandName)}${brandName !== 'GrowthOS' ? ' via GrowthOS' : ''} on ${new Date().toISOString().slice(0, 10)}</footer>
</body>
</html>`
}
