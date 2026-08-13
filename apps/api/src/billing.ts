import Stripe from 'stripe'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { Plan, Subscription, SubscriptionStatus } from '@growthos/types'
import { AppError } from './errors.js'
import { getWorkspaceOwnerEmail, sendPaymentFailedEmail, sendTrialConvertedEmail, sendTrialEndingSoonEmail } from './emails.js'
import { moduleLogger } from './logger.js'

const log = moduleLogger('billing')

/**
 * Stripe billing (M5 P5.1): checkout, webhook sync, and the trial→paid lifecycle. Reuses
 * `legacy/services/auth-service/app/billing.py` as the behavioral spec, ported to this app's
 * Fastify/Drizzle/Zod conventions. `subscriptions` mirrors Stripe (see schema/billing.ts) —
 * Stripe stays the source of truth for payment state; this table is a read model kept in sync by
 * webhooks. `workspaces.plan` is kept denormalized in lockstep since several read paths
 * (`GET /auth/me`, `GET /workspaces`) already select it directly.
 *
 * Plan-limit enforcement (`PLAN_LIMIT_REACHED`, usage metering) is out of scope here — that's M5
 * P5.2, built on top of the `usage_records` table this phase also creates.
 */

const TRIAL_DAYS = 14
// PRD 4.1: "14-day free trial (Growth tier, no credit card)".
const TRIAL_PLAN: Plan = 'growth'

const PLAN_PRICE_ENV: Record<Plan, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth: process.env.STRIPE_PRICE_GROWTH,
  scale: process.env.STRIPE_PRICE_SCALE,
}

function webOrigin(): string {
  return process.env.WEB_ORIGIN ?? 'http://localhost:3000'
}

async function getWorkspaceName(workspaceId: string): Promise<string> {
  const [row] = await db
    .select({ name: schema.workspaces.name })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1)
  return row?.name ?? 'your workspace'
}

let stripeClient: Stripe | undefined

/** Lazily construct the Stripe client. Throws INTEGRATION_NOT_CONNECTED if unconfigured — never crashes. */
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new AppError(
      'INTEGRATION_NOT_CONNECTED',
      'Stripe is not configured on this environment — set STRIPE_SECRET_KEY.',
    )
  }
  if (!stripeClient) stripeClient = new Stripe(key)
  return stripeClient
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due'
    default:
      // canceled | incomplete_expired | paused
      return 'canceled'
  }
}

/** Subscription period bounds, in the shape stripe@17's typings expose them on Subscription. */
function periodBounds(sub: Stripe.Subscription): { start: Date; end: Date } {
  return {
    start: new Date(sub.current_period_start * 1000),
    end: new Date(sub.current_period_end * 1000),
  }
}

/**
 * Start the trial subscription for a newly-created workspace. Called right after Better Auth's
 * organization is created (see routes/v1.ts `POST /workspaces`). Best-effort — a failure here
 * never blocks workspace creation; `getCurrentSubscription` falls back cleanly if no row exists.
 */
export async function startTrial(workspaceId: string): Promise<void> {
  try {
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    await db.insert(schema.subscriptions).values({
      workspaceId,
      plan: TRIAL_PLAN,
      status: 'trialing',
      trialEndsAt,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
    })
    await db.update(schema.workspaces).set({ plan: TRIAL_PLAN }).where(eq(schema.workspaces.id, workspaceId))
  } catch (err) {
    // Never block workspace creation on billing — `getCurrentSubscription` falls back cleanly when
    // no row exists. But this failing silently means a customer who should be on a 14-day Growth
    // trial is quietly treated as Starter, which they will experience as features mysteriously
    // missing. That needs to be visible to an operator, even though it is not worth failing on.
    log.error({ err }, `startTrial failed for workspace ${workspaceId}`)
  }
}

/** Current subscription for a workspace. No row yet (pre-migration workspace, or startTrial failed) → starter/trialing. */
export async function getCurrentSubscription(workspaceId: string): Promise<Subscription> {
  const [row] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.workspaceId, workspaceId))
    .limit(1)

  if (!row) {
    return {
      plan: 'starter',
      status: 'trialing',
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAt: null,
    }
  }
  return {
    plan: row.plan as Plan,
    status: row.status as SubscriptionStatus,
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAt: row.cancelAt?.toISOString() ?? null,
  }
}

/** Create a Stripe Checkout session for a plan upgrade/purchase. Reuses the existing Stripe customer, if any. */
export async function createCheckoutSession(
  workspaceId: string,
  plan: Plan,
  userEmail: string,
): Promise<{ checkoutUrl: string }> {
  const stripe = getStripe()
  const priceId = PLAN_PRICE_ENV[plan]
  if (!priceId) {
    throw new AppError('INTEGRATION_NOT_CONNECTED', `No Stripe Price ID configured for the '${plan}' plan.`)
  }

  const [existing] = await db
    .select({ stripeCustomerId: schema.subscriptions.stripeCustomerId })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.workspaceId, workspaceId))
    .limit(1)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${webOrigin()}/settings/billing?checkout=success`,
    cancel_url: `${webOrigin()}/settings/billing?checkout=cancelled`,
    client_reference_id: workspaceId,
    ...(existing?.stripeCustomerId
      ? { customer: existing.stripeCustomerId }
      : { customer_email: userEmail }),
    metadata: { workspaceId, plan },
    subscription_data: { metadata: { workspaceId, plan } },
  })

  if (!session.url) {
    throw new AppError('INTERNAL_ERROR', 'Stripe did not return a checkout URL.')
  }
  return { checkoutUrl: session.url }
}

/** Create a Stripe Customer Portal session so the workspace can manage payment method / invoices / cancel. */
export async function createPortalSession(workspaceId: string): Promise<{ portalUrl: string }> {
  const stripe = getStripe()
  const [existing] = await db
    .select({ stripeCustomerId: schema.subscriptions.stripeCustomerId })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.workspaceId, workspaceId))
    .limit(1)

  if (!existing?.stripeCustomerId) {
    throw new AppError(
      'VALIDATION_ERROR',
      'No billing account yet — start a checkout first (Settings → Billing).',
    )
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: existing.stripeCustomerId,
    return_url: `${webOrigin()}/settings`,
  })
  return { portalUrl: session.url }
}

/**
 * Scan trialing subscriptions ending within `withinDays` and send the reminder once per trial.
 * Wired to the daily cron in `scheduler.ts`, which additionally holds a Redis lock so N API
 * instances produce one run.
 *
 * The reminder is *claimed* before it is sent, not marked after: the write sets
 * `trialReminderSentAt` only `WHERE trial_reminder_sent_at IS NULL`, and the email goes out only if
 * that update actually took a row. Marking after sending left a window where two concurrent runs
 * both passed the `!sub.trialReminderSentAt` check and both emailed the same customer
 * (docs/AUDIT-2026-08-13-post-merge.md #10). Claiming first makes the send at-most-once; the
 * trade-off is that an email-provider failure after the claim costs that workspace its reminder,
 * which is the right way round for a marketing email.
 */
export async function checkTrialsEndingSoon(withinDays = 3): Promise<{ remindersSent: number }> {
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000)
  const candidates = await db
    .select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.status, 'trialing'),
        isNull(schema.subscriptions.trialReminderSentAt),
      ),
    )

  let remindersSent = 0
  for (const sub of candidates) {
    if (!sub.trialEndsAt || sub.trialEndsAt > cutoff) continue
    // Resolve the recipient before claiming, so a workspace with no owner email keeps its reminder
    // available for the next run rather than burning it on a send that can't happen.
    const ownerEmail = await getWorkspaceOwnerEmail(sub.workspaceId)
    if (!ownerEmail) continue

    const claimed = await db
      .update(schema.subscriptions)
      .set({ trialReminderSentAt: new Date() })
      .where(
        and(eq(schema.subscriptions.id, sub.id), isNull(schema.subscriptions.trialReminderSentAt)),
      )
      .returning({ id: schema.subscriptions.id })
    if (claimed.length === 0) continue // another run claimed it first

    const workspaceName = await getWorkspaceName(sub.workspaceId)
    const daysLeft = Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    await sendTrialEndingSoonEmail(ownerEmail, workspaceName, daysLeft)
    remindersSent++
  }
  return { remindersSent }
}

/** Full upsert from a live Stripe subscription object — used once we know both workspace and plan. */
async function syncSubscription(workspaceId: string, plan: Plan, sub: Stripe.Subscription): Promise<void> {
  const { start, end } = periodBounds(sub)
  const values = {
    workspaceId,
    stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    plan,
    status: mapStripeStatus(sub.status),
    currentPeriodStart: start,
    currentPeriodEnd: end,
    cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
    updatedAt: new Date(),
  }

  const [existing] = await db
    .select({ id: schema.subscriptions.id })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.workspaceId, workspaceId))
    .limit(1)

  if (existing) {
    await db.update(schema.subscriptions).set(values).where(eq(schema.subscriptions.workspaceId, workspaceId))
  } else {
    await db.insert(schema.subscriptions).values(values)
  }
  await db.update(schema.workspaces).set({ plan }).where(eq(schema.workspaces.id, workspaceId))
}

/**
 * Verify + apply a Stripe webhook event. Handles the three events the Stripe endpoint is
 * subscribed to (see .env.example): checkout completion, subscription updates, and cancellation.
 * Unrecognized event types are ignored (Stripe expects a 200 either way).
 */
export async function handleWebhookEvent(rawBody: Buffer, signature: string | undefined): Promise<void> {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new AppError('INTEGRATION_NOT_CONNECTED', 'Stripe webhook secret is not configured.')
  }
  if (!signature) {
    throw new AppError('VALIDATION_ERROR', 'Missing Stripe-Signature header.')
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    // The response stays deliberately vague — never tell an unauthenticated caller why their
    // signature was rejected. The log is not vague: a run of these is either a misconfigured
    // webhook secret or somebody probing the endpoint, and both need to be visible.
    log.error({ err }, 'rejected a webhook with an invalid signature')
    throw new AppError('VALIDATION_ERROR', 'Invalid Stripe webhook signature.')
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id ?? undefined
      const plan = session.metadata?.plan as Plan | undefined
      if (!workspaceId || !plan || !session.subscription) break
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id
      const sub = await stripe.subscriptions.retrieve(subscriptionId)

      // Stripe retries a webhook until it gets a 2xx, and a retry carries the same event.
      // `syncSubscription` is idempotent; the email is not. Treat "we have not recorded this Stripe
      // subscription id yet" as the signal that this is the first delivery, so a retry syncs again
      // but stays silent (docs/AUDIT-2026-08-13-post-merge.md #11).
      const [before] = await db
        .select({ stripeSubscriptionId: schema.subscriptions.stripeSubscriptionId })
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.workspaceId, workspaceId))
        .limit(1)
      const isFirstDelivery = before?.stripeSubscriptionId !== sub.id

      await syncSubscription(workspaceId, plan, sub)

      if (isFirstDelivery) {
        const [ownerEmail, workspaceName] = await Promise.all([
          getWorkspaceOwnerEmail(workspaceId),
          getWorkspaceName(workspaceId),
        ])
        if (ownerEmail) void sendTrialConvertedEmail(ownerEmail, workspaceName, plan)
      }
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object
      const workspaceId = sub.metadata?.workspaceId
      const plan = sub.metadata?.plan as Plan | undefined
      if (workspaceId && plan) {
        await syncSubscription(workspaceId, plan, sub)
      } else {
        // Metadata missing (e.g. edited directly in the Stripe dashboard) — sync status/dates only.
        const { start, end } = periodBounds(sub)
        await db
          .update(schema.subscriptions)
          .set({
            status: mapStripeStatus(sub.status),
            currentPeriodStart: start,
            currentPeriodEnd: end,
            cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.stripeSubscriptionId, sub.id))
      }

      // Dunning email — only on the transition *into* past_due, never on every subsequent update.
      const previousStatus = (event.data.previous_attributes as Partial<Stripe.Subscription> | undefined)?.status
      if (sub.status === 'past_due' && previousStatus && previousStatus !== 'past_due') {
        const resolvedWorkspaceId =
          workspaceId ??
          (
            await db
              .select({ workspaceId: schema.subscriptions.workspaceId })
              .from(schema.subscriptions)
              .where(eq(schema.subscriptions.stripeSubscriptionId, sub.id))
              .limit(1)
          )[0]?.workspaceId
        if (resolvedWorkspaceId) {
          const [ownerEmail, workspaceName, portal] = await Promise.all([
            getWorkspaceOwnerEmail(resolvedWorkspaceId),
            getWorkspaceName(resolvedWorkspaceId),
            createPortalSession(resolvedWorkspaceId).catch(() => null),
          ])
          if (ownerEmail && portal) void sendPaymentFailedEmail(ownerEmail, workspaceName, portal.portalUrl)
        }
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      await db
        .update(schema.subscriptions)
        .set({ status: 'canceled', updatedAt: new Date() })
        .where(eq(schema.subscriptions.stripeSubscriptionId, sub.id))
      break
    }
    default:
      break
  }
}
