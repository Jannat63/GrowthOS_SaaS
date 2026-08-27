import { channelLabel, type ReportChannel, type ReportMetric, type WeeklyReport } from '@growthos/logic'
import type { WhiteLabelConfig } from '@growthos/types'

/**
 * White-labeled PDF report (M3 P3.5 Slice C2). This module is the pure HTML-templating half —
 * no Puppeteer, no database, no network. It renders the same `WeeklyReport` the Intelligence page
 * already shows on-screen (see intelligence.ts `getWeeklyReport`) into a standalone, self-styled
 * HTML document, with the workspace's `WhiteLabelConfig` applied (falls back to the default
 * GrowthOS brand when a field is unset — see the type's own doc comment). Deliberately kept
 * separate from `pdf-report-generate.ts` (which drives Puppeteer) so this templating logic is
 * testable without a headless browser, the same split used for schema-markup.ts.
 *
 * This is a customer deliverable, so two rules hold throughout: no channel slug ever reaches the
 * page (everything goes through `channelLabel()`), and a modelled figure is marked as an estimate
 * rather than presented alongside measured ones without comment.
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

/** An em dash, not "0" or "0.00x": these figures do not exist for a channel that buys no media. */
const NONE = '&mdash;'

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * The period the figures were measured over — not the calendar week the report is filed under.
 * A workspace whose pipelines lag reports on a window that ended days or weeks ago, and the
 * document has to say which.
 */
function periodLabel(report: WeeklyReport): string {
  if (!report.period) return `Week of ${report.weekStart}`
  return `${formatDay(report.period.from)} &ndash; ${formatDay(report.period.to)}`
}

/**
 * "+12% vs prior week", coloured by direction.
 *
 * `neutral` is for costs. Spending more is neither good nor bad on its own — it is only readable
 * against what it returned, which is exactly what the MER figure beside it says. Painting a spend
 * increase green would tell a customer that spending more is a win.
 */
function delta(metric: ReportMetric, neutral = false): string {
  if (metric.deltaPct === null) return '<div class="delta muted">No prior period</div>'
  if (metric.deltaPct === 0) return '<div class="delta muted">Flat vs prior week</div>'
  const sign = metric.deltaPct > 0 ? '+' : '&minus;'
  const tone = neutral ? 'muted' : metric.deltaPct > 0 ? 'up' : 'down'
  return `<div class="delta ${tone}">${sign}${Math.abs(metric.deltaPct)}% vs prior week</div>`
}

function statBlock(label: string, value: string, metric: ReportMetric, neutral = false): string {
  return `<div class="stat">
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    ${delta(metric, neutral)}
  </div>`
}

function channelRow(c: ReportChannel): string {
  const isPaid = c.paid !== false
  // Organic carries clicks rather than conversions, and its revenue is modelled. Both belong beside
  // the channel's name, so the numeric columns stay comparable down the table.
  const notes: string[] = []
  if (c.clicks) notes.push(`${c.clicks.toLocaleString('en-US')} clicks`)
  if (c.modelled) notes.push('estimated')
  const note = notes.length ? `<div class="note">${escapeHtml(notes.join(' &middot; '))}</div>` : ''

  const roasCell =
    c.roas === null
      ? NONE
      : `${c.roas.toFixed(2)}x${
          c.roasDelta === null || c.roasDelta === 0
            ? ''
            : `<span class="${c.roasDelta > 0 ? 'up' : 'down'}"> ${c.roasDelta > 0 ? '+' : '&minus;'}${Math.abs(c.roasDelta).toFixed(2)}</span>`
        }`

  return `<tr>
    <td><strong>${escapeHtml(channelLabel(c.channel))}</strong>${note}</td>
    <td>${isPaid ? money(c.spend) : NONE}</td>
    <td>${money(c.revenue)}</td>
    <td>${isPaid && c.conversions ? c.conversions.toLocaleString('en-US') : NONE}</td>
    <td>${c.cpa === null ? NONE : money(c.cpa)}</td>
    <td>${roasCell}</td>
  </tr>`
}

/** Pure — builds the full standalone HTML document that gets rendered to PDF. */
export function renderReportHtml(
  workspaceName: string,
  report: WeeklyReport,
  branding: WhiteLabelConfig,
): string {
  const brandName = branding.agencyName?.trim() || 'GrowthOS'
  // Matches --primary (light) in apps/web/styles/globals.css — a workspace that has not set a
  // brand colour should get a PDF in GrowthOS ember, not the retired pre-rebrand indigo.
  const primaryColor = branding.primaryColor?.trim() || '#ce4218'
  const logoHtml = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(brandName)}" class="logo" />`
    : `<div class="logo-fallback">${escapeHtml(brandName)}</div>`

  const channelRows = report.channelBreakdown.map(channelRow).join('')
  const hasModelled = report.channelBreakdown.some((c) => c.modelled)

  const opportunityItems = report.topOpportunities
    .map((o) => {
      const bridge =
        o.sourceChannel && o.targetChannel && o.sourceChannel !== o.targetChannel && o.sourceChannel !== 'unified'
          ? `<div class="bridge">${escapeHtml(channelLabel(o.sourceChannel))} &rarr; ${escapeHtml(channelLabel(o.targetChannel))}</div>`
          : ''
      return `<li>${bridge}<strong>${escapeHtml(o.title)}</strong><p>${escapeHtml(o.body)}</p></li>`
    })
    .join('')

  const remaining = report.openOpportunities - report.topOpportunities.length
  const remainingNote =
    remaining > 0
      ? `<p class="more">${remaining} further recommendation${remaining === 1 ? '' : 's'} open in the queue.</p>`
      : ''

  const reallocationBlock = report.budgetReallocation
    ? `<div class="callout">
        <strong>Suggested budget move:</strong> Shift ${money(report.budgetReallocation.amount)} from
        ${escapeHtml(channelLabel(report.budgetReallocation.fromChannel))} to ${escapeHtml(
          channelLabel(report.budgetReallocation.toChannel),
        )}.
        <p>${escapeHtml(report.budgetReallocation.reason)}</p>
        <p class="basis">${escapeHtml(report.budgetReallocation.basis)}</p>
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
  .headline { font-size: 17px; font-weight: 600; line-height: 1.4; margin: 18px 0 0; }
  .summary { background: #f7f7f9; border-left: 4px solid var(--primary); padding: 14px 18px; margin: 14px 0 20px; font-size: 14px; }
  .stat-row { display: flex; gap: 12px; margin: 20px 0; }
  .stat { flex: 1; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; }
  .stat .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
  .stat .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  .delta { font-size: 11px; margin-top: 4px; }
  .up { color: #0e7a52; }
  .down { color: #b3213f; }
  .muted { color: #999; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th, td { text-align: right; padding: 8px 10px; border-bottom: 1px solid #eee; }
  th:first-child, td:first-child { text-align: left; }
  th { color: #888; font-weight: 600; font-size: 11px; text-transform: uppercase; }
  td .note { color: #999; font-size: 11px; font-weight: 400; margin-top: 2px; }
  .callout { background: #fff8ec; border: 1px solid #f0dca6; border-radius: 8px; padding: 14px 18px; margin: 16px 0; font-size: 13px; }
  .callout p { margin: 4px 0 0; }
  .callout .basis { color: #7a6a45; font-size: 12px; }
  ul.opps { list-style: none; padding: 0; margin: 16px 0; }
  ul.opps li { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; }
  ul.opps li p { margin: 4px 0 0; color: #555; font-size: 13px; }
  .bridge { font-size: 11px; color: var(--primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
  .more { color: #666; font-size: 12px; margin: 0; }
  .footnote { color: #999; font-size: 11px; margin: 10px 0 0; }
  footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
</style>
</head>
<body>
  <header>
    ${logoHtml}
    <div class="period">${periodLabel(report)}</div>
  </header>
  <h1>${escapeHtml(workspaceName)} &mdash; Weekly Growth Report</h1>
  <p class="headline">${escapeHtml(report.headline)}</p>
  <div class="summary">${escapeHtml(report.summary)}</div>
  <div class="stat-row">
    ${statBlock('Blended MER', `${report.blendedMer.value.toFixed(2)}x`, report.blendedMer)}
    ${statBlock('Paid ROAS', `${report.paidRoas.value.toFixed(2)}x`, report.paidRoas)}
    ${statBlock('Total revenue', money(report.revenue.value), report.revenue)}
    ${statBlock('Ad spend', money(report.adSpend.value), report.adSpend, true)}
  </div>
  ${reallocationBlock}
  <h2>Channel breakdown</h2>
  <table>
    <thead><tr><th>Channel</th><th>Spend</th><th>Revenue</th><th>Conv.</th><th>CPA</th><th>ROAS</th></tr></thead>
    <tbody>${channelRows || '<tr><td colspan="6">No channel data for this period.</td></tr>'}</tbody>
  </table>
  ${hasModelled ? '<p class="footnote">Organic revenue is estimated from the share of total revenue not attributed to ads. Clicks are measured.</p>' : ''}
  <h2>Top opportunities</h2>
  <ul class="opps">${opportunityItems || '<li>No open recommendations this week.</li>'}</ul>
  ${remainingNote}
  <footer>Generated by ${escapeHtml(brandName)}${brandName !== 'GrowthOS' ? ' via GrowthOS' : ''} on ${new Date().toISOString().slice(0, 10)}</footer>
</body>
</html>`
}
