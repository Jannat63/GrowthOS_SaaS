import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { Plan, Subscription, SubscriptionStatus } from '@growthos/types'
import { AppError } from './errors.js'

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
  } catch {
    // Non-critical — see fallback in getCurrentSubscription.
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
  } catch {
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
      await syncSubscription(workspaceId, plan, sub)
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
