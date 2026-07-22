import { createElement as e, type ReactElement } from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
  type DocumentProps,
} from '@react-pdf/renderer'
import type { WeeklyReport } from '@growthos/logic'
import type { WhiteLabelConfig } from '@growthos/types'

// Default GrowthOS brand — matches the app's indigo `--primary` / deep-indigo `--ink` tokens.
const DEFAULT_ACCENT = '#4f46e5'
const INK = '#1e1b4b'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'

const CHANNEL_LABEL: Record<string, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  google_search_console: 'Search Console',
  organic: 'Organic Search',
}
function channelLabel(slug: string): string {
  return CHANNEL_LABEL[slug] ?? slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontFamily: 'Helvetica', color: INK },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginTop: 8 },
  subtitle: { fontSize: 10, color: MUTED, marginTop: 4 },
  logo: { maxWidth: 120, maxHeight: 40, objectFit: 'contain' },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  metricCard: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 12 },
  metricLabel: { fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginTop: 6 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 8, marginTop: 8 },
  summary: { fontSize: 10, lineHeight: 1.5, color: '#374151', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: BORDER, paddingBottom: 6, marginBottom: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  th: { fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { fontSize: 10 },
  colChannel: { flex: 2 },
  colNum: { flex: 1, textAlign: 'right' },
  opportunity: { borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 10, marginBottom: 8 },
  oppTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  oppBody: { fontSize: 9, color: MUTED, marginTop: 3, lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 1,
    borderColor: BORDER,
    paddingTop: 8,
  },
})

function metric(label: string, value: string): ReactElement {
  return e(View, { style: styles.metricCard }, [
    e(Text, { key: 'l', style: styles.metricLabel }, label),
    e(Text, { key: 'v', style: styles.metricValue }, value),
  ])
}

function channelTable(report: WeeklyReport): ReactElement {
  const header = e(View, { key: 'head', style: styles.tableHeader }, [
    e(Text, { key: 'c', style: [styles.th, styles.colChannel] }, 'Channel'),
    e(Text, { key: 's', style: [styles.th, styles.colNum] }, 'Spend'),
    e(Text, { key: 'r', style: [styles.th, styles.colNum] }, 'Revenue'),
    e(Text, { key: 'o', style: [styles.th, styles.colNum] }, 'ROAS'),
  ])
  const rows =
    report.channelBreakdown.length === 0
      ? [e(Text, { key: 'empty', style: [styles.td, { color: MUTED, paddingVertical: 8 }] }, 'No channel data yet.')]
      : report.channelBreakdown.map((c) =>
          e(View, { key: c.channel, style: styles.tableRow }, [
            e(Text, { key: 'c', style: [styles.td, styles.colChannel] }, channelLabel(c.channel)),
            e(Text, { key: 's', style: [styles.td, styles.colNum] }, usd(c.spend)),
            e(Text, { key: 'r', style: [styles.td, styles.colNum] }, usd(c.revenue)),
            e(Text, { key: 'o', style: [styles.td, styles.colNum] }, `${c.roas.toFixed(2)}x`),
          ]),
        )
  return e(View, {}, [header, ...rows])
}

/**
 * Render a workspace's Weekly Growth Intelligence Report to a PDF Buffer, branded with the
 * agency's white-label config (falls back to the GrowthOS brand when unset). Pure — no I/O
 * beyond fetching a remote logo image if `logoUrl` is provided. This function is the seam a
 * future R2 uploader would call in place of streaming the buffer to the client.
 */
export async function renderWeeklyReportPdf(
  report: WeeklyReport,
  branding?: WhiteLabelConfig | null,
): Promise<Buffer> {
  const accent = branding?.primaryColor || DEFAULT_ACCENT
  const brandName = branding?.agencyName || 'GrowthOS'
  const logoUrl = branding?.logoUrl || null

  const headerLeft = e(View, {}, [
    e(Text, { key: 'brand', style: [styles.brand, { color: accent }] }, brandName),
    e(Text, { key: 'title', style: styles.title }, 'Weekly Intelligence Report'),
    e(Text, { key: 'sub', style: styles.subtitle }, `Cross-channel performance for the week of ${report.weekStart}`),
  ])
  const header = e(View, { style: styles.header }, [
    e(View, { key: 'left' }, headerLeft),
    logoUrl ? e(Image, { key: 'logo', src: logoUrl, style: styles.logo }) : null,
  ])

  const metrics = e(View, { style: styles.metricsRow }, [
    e(View, { key: 'roas' }, metric('Blended ROAS', `${report.blendedRoas.toFixed(2)}x`)),
    e(View, { key: 'rev' }, metric('Total revenue', usd(report.totalRevenue))),
    e(View, { key: 'spend' }, metric('Total spend', usd(report.totalSpend))),
  ])

  const summary = e(View, {}, [
    e(Text, { key: 't', style: styles.sectionTitle }, 'Summary'),
    e(Text, { key: 'b', style: styles.summary }, report.summary),
  ])

  const channelTableEl = channelTable(report)
  const channels = e(View, {}, [
    e(Text, { key: 't', style: styles.sectionTitle }, 'Channel breakdown'),
    e(View, { key: 'table' }, channelTableEl),
  ])

  const budget = report.budgetReallocation
    ? e(View, { style: { marginTop: 20 } }, [
        e(Text, { key: 't', style: styles.sectionTitle }, 'Suggested budget move'),
        e(
          Text,
          { key: 'm', style: [styles.summary, { marginBottom: 6 }] },
          `Shift ${usd(report.budgetReallocation.amount)} from ${channelLabel(
            report.budgetReallocation.fromChannel,
          )} to ${channelLabel(report.budgetReallocation.toChannel)}.`,
        ),
        e(Text, { key: 'r', style: [styles.oppBody, { marginTop: 0 }] }, report.budgetReallocation.reason),
      ])
    : null

  const opportunities =
    report.topOpportunities.length > 0
      ? e(View, { style: { marginTop: 20 } }, [
          e(Text, { key: 't', style: styles.sectionTitle }, 'Top opportunities'),
          ...report.topOpportunities.map((o, i) =>
            e(View, { key: i, style: styles.opportunity }, [
              e(Text, { key: 't', style: styles.oppTitle }, o.title),
              e(Text, { key: 'b', style: styles.oppBody }, o.body),
            ]),
          ),
        ])
      : null

  const footer = e(View, { key: 'footer', style: styles.footer, fixed: true }, [
    e(Text, { key: 'l' }, `Generated by ${brandName}`),
    e(Text, {
      key: 'r',
      render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        `Page ${pageNumber} of ${totalPages}`,
    }),
  ])

  const doc = e(
    Document,
    { title: `Weekly Intelligence Report — ${report.weekStart}`, author: brandName },
    e(Page, { size: 'A4', style: styles.page }, [
      e(View, { key: 'header' }, header),
      e(View, { key: 'metrics' }, metrics),
      e(View, { key: 'summary' }, summary),
      e(View, { key: 'channels' }, channels),
      budget ? e(View, { key: 'budget' }, budget) : null,
      opportunities ? e(View, { key: 'opps' }, opportunities) : null,
      footer,
    ]),
  )

  return renderToBuffer(doc as ReactElement<DocumentProps>)
}
