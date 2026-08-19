import { Resend } from 'resend'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { Plan } from '@growthos/types'
import { moduleLogger } from './logger.js'

const log = moduleLogger('emails')

/**
 * Lifecycle emails (M5 P5.3): trial-ending, payment-failed (dunning), and trial-converted
 * notifications, sent via Resend. Receipts are NOT reinvented here — Stripe's built-in customer
 * emails (toggle in the Stripe Dashboard → Settings → Customer emails) already cover successful
 * payment / invoice receipts, and that's the standard practice rather than hand-rolling billing
 * receipts.
 *
 * Every send here is best-effort: a Resend failure is caught and logged, never thrown. These
 * fire from inside the Stripe webhook handler and checkout flow, whose own success (returning 200
 * to Stripe, completing checkout) must never depend on whether an email happened to go out.
 */

let resendClient: Resend | undefined

function getResend(): Resend | undefined {
  const key = process.env.RESEND_API_KEY
  if (!key) return undefined
  if (!resendClient) resendClient = new Resend(key)
  return resendClient
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'GrowthOS <billing@growthos.app>'
}

/** The workspace's billing contact — the org's `owner`. Best-effort: returns null if not found. */
export async function getWorkspaceOwnerEmail(workspaceId: string): Promise<string | null> {
  const [owner] = await db
    .select({ email: schema.user.email })
    .from(schema.workspace_members)
    .innerJoin(schema.user, eq(schema.workspace_members.userId, schema.user.id))
    .where(and(eq(schema.workspace_members.organizationId, workspaceId), eq(schema.workspace_members.role, 'owner')))
    .limit(1)
  return owner?.email ?? null
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const resend = getResend()
  if (!resend) {
    // Not configured — same "gated, never crashes" pattern as Stripe. Nothing downstream depends on this succeeding.
    return
  }
  try {
    await resend.emails.send({ from: fromAddress(), to, subject, html })
  } catch (err) {
    log.error({ err, to, subject }, 'Resend send failed')
  }
}

export async function sendTrialEndingSoonEmail(to: string, workspaceName: string, daysLeft: number): Promise<void> {
  await send(
    to,
    `Your GrowthOS trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    `<p>Hi,</p>
     <p>Your Growth-tier trial for <strong>${workspaceName}</strong> ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.
     Add a payment method to keep your recommendations, reports, and connected accounts running without interruption.</p>
     <p><a href="${webOriginForEmails()}/settings">Manage billing</a></p>`,
  )
}

export async function sendPaymentFailedEmail(to: string, workspaceName: string, portalUrl: string): Promise<void> {
  await send(
    to,
    `Action needed: payment failed for ${workspaceName}`,
    `<p>Hi,</p>
     <p>We couldn't process your latest payment for <strong>${workspaceName}</strong>. Update your payment
     method to avoid a service interruption.</p>
     <p><a href="${portalUrl}">Update payment method</a></p>`,
  )
}

export async function sendTrialConvertedEmail(to: string, workspaceName: string, plan: Plan): Promise<void> {
  await send(
    to,
    `You're on the ${plan[0]!.toUpperCase()}${plan.slice(1)} plan`,
    `<p>Hi,</p>
     <p>Thanks for upgrading <strong>${workspaceName}</strong> to the ${plan} plan. Your subscription is active.</p>
     <p><a href="${webOriginForEmails()}/settings">View billing details</a></p>`,
  )
}

function webOriginForEmails(): string {
  return process.env.WEB_ORIGIN ?? 'http://localhost:3000'
}
