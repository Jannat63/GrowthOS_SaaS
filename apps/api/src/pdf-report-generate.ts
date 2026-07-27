import puppeteer, { type Browser } from 'puppeteer'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { WhiteLabelConfig } from '@growthos/types'
import { AppError } from './errors.js'
import { getWeeklyReport } from './intelligence.js'
import { renderReportHtml } from './pdf-report.js'

/**
 * Drives Puppeteer to turn the pure HTML template (pdf-report.ts) into an actual PDF buffer. Kept
 * in its own file so pdf-report.ts's templating logic stays testable without a headless browser.
 *
 * R2 storage was the blueprint's original plan for this slice (see plan.md) but isn't wired up —
 * no Cloudflare credentials exist anywhere in this codebase (same "gated" status as Google
 * Ads/Meta/DataForSEO — see GO_LIVE_CHECKLIST.md §2). Generating the PDF on demand and streaming
 * it straight back in the HTTP response sidesteps that entirely: nothing is persisted, so there's
 * nothing to upload. A "past reports" history feature would need R2 (or equivalent) later; a
 * one-off "download my report now" button doesn't.
 */

let browserPromise: Promise<Browser> | null = null

/** Reuses one headless browser instance across requests — relaunching Chromium per request is slow. */
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
      .catch((err) => {
        browserPromise = null // don't cache a failed launch — let the next request retry
        throw err
      })
  }
  return browserPromise
}

export interface GeneratedReport {
  buffer: Buffer
  filename: string
}

export async function generateReportPdf(workspaceId: string): Promise<GeneratedReport> {
  const [workspaceRow] = await db
    .select({ name: schema.workspaces.name, slug: schema.workspaces.slug, whiteLabelConfig: schema.workspaces.whiteLabelConfig })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1)

  if (!workspaceRow) {
    throw new AppError('WORKSPACE_NOT_FOUND', 'Workspace not found.')
  }

  const report = await getWeeklyReport(workspaceId)
  const branding = (workspaceRow.whiteLabelConfig as WhiteLabelConfig | null) ?? {}
  const html = renderReportHtml(workspaceRow.name, report, branding)

  let browser: Browser
  try {
    browser = await getBrowser()
  } catch {
    // No Chromium available in this environment — same "gated integration, never crashes the
    // app" pattern as Stripe/Resend, rather than a raw 500 with a Puppeteer stack trace.
    throw new AppError(
      'INTEGRATION_NOT_CONNECTED',
      'PDF rendering is unavailable in this environment (Puppeteer/Chromium not installed).',
    )
  }

  const page = await browser.newPage()
  try {
    // 'load' (not 'domcontentloaded') so a remote branding.logoUrl image has time to actually
    // load before the page is captured — setContent's type no longer accepts 'networkidle0'.
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    })
    return { buffer: Buffer.from(pdf), filename: `${workspaceRow.slug}-weekly-report-${report.weekStart}.pdf` }
  } finally {
    await page.close()
  }
}
