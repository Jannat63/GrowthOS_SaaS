import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { db, schema } from '@growthos/db'
import { checkTrialsEndingSoon, getCurrentSubscription, startTrial, handleWebhookEvent } from './billing.js'

// Integration: requires Neon (dev stack up). The webhook tests additionally need
// STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET set in apps/api/.env — any test-mode values work,
// since `stripe.webhooks.constructEvent` verifies the signature locally and never calls Stripe's
// API for the event types exercised here (subscription.updated / .deleted only; checkout.session
// .completed additionally calls `stripe.subscriptions.retrieve`, so it isn't covered offline).
describe('billing', () => {
  const ws = 'test-billing-ws'

  afterAll(async () => {
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.workspaceId, ws))
  })

  describe('getCurrentSubscription', () => {
    it('falls back to starter/trialing when no row exists', async () => {
      const sub = await getCurrentSubscription('no-such-workspace')
      expect(sub).toEqual({
        plan: 'starter',
        status: 'trialing',
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAt: null,
      })
    })
  })

  describe('startTrial', () => {
    it('creates a 14-day Growth trial and mirrors the plan onto workspaces', async () => {
      await db
        .insert(schema.workspaces)
        .values({ id: ws, name: 'Billing Test', slug: ws, createdAt: new Date() })
        .onConflictDoNothing()

      await startTrial(ws)

      const sub = await getCurrentSubscription(ws)
      expect(sub.plan).toBe('growth')
      expect(sub.status).toBe('trialing')
      expect(sub.trialEndsAt).not.toBeNull()

      const [workspace] = await db
        .select({ plan: schema.workspaces.plan })
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, ws))
      expect(workspace?.plan).toBe('growth')
    })
  })

  describe('handleWebhookEvent', () => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''
    const runIfConfigured = webhookSecret ? it : it.skip

    function sign(payload: string): string {
      return Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret })
    }

    runIfConfigured('rejects an invalid signature', async () => {
      const payload = JSON.stringify({ id: 'evt_test', type: 'customer.subscription.deleted' })
      await expect(handleWebhookEvent(Buffer.from(payload), 'bad-signature')).rejects.toThrow(
        'Invalid Stripe webhook signature.',
      )
    })

    runIfConfigured('rejects a missing signature header', async () => {
      const payload = JSON.stringify({ id: 'evt_test', type: 'customer.subscription.deleted' })
      await expect(handleWebhookEvent(Buffer.from(payload), undefined)).rejects.toThrow(
        'Missing Stripe-Signature header.',
      )
    })

    runIfConfigured('syncs status + dates from customer.subscription.updated', async () => {
      const now = Math.floor(Date.now() / 1000)
      const payload = JSON.stringify({
        id: 'evt_test_updated',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_1',
            customer: 'cus_test_1',
            status: 'active',
            current_period_start: now,
            current_period_end: now + 30 * 24 * 60 * 60,
            cancel_at: null,
            metadata: { workspaceId: ws, plan: 'scale' },
          },
        },
      })
      await handleWebhookEvent(Buffer.from(payload), sign(payload))

      const sub = await getCurrentSubscription(ws)
      expect(sub.plan).toBe('scale')
      expect(sub.status).toBe('active')
      expect(sub.currentPeriodEnd).not.toBeNull()
    })

    runIfConfigured('does not throw on a past_due transition for an unknown subscription (no DB row, no network call)', async () => {
      const now = Math.floor(Date.now() / 1000)
      const payload = JSON.stringify({
        id: 'evt_test_pastdue',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_unmatched',
            customer: 'cus_test_unmatched',
            status: 'past_due',
            current_period_start: now,
            current_period_end: now + 30 * 24 * 60 * 60,
            cancel_at: null,
            metadata: {},
          },
          previous_attributes: { status: 'active' },
        },
      })
      // No metadata.workspaceId and no existing row for sub_test_unmatched → resolvedWorkspaceId
      // stays undefined, so the dunning-email branch (and its createPortalSession call) never
      // fires. This only proves the handler doesn't throw on the shape; the real network call in
      // createPortalSession isn't exercised offline (same limitation as checkout.session.completed).
      await expect(handleWebhookEvent(Buffer.from(payload), sign(payload))).resolves.toBeUndefined()
    })

    runIfConfigured('cancels on customer.subscription.deleted', async () => {
      const payload = JSON.stringify({
        id: 'evt_test_deleted',
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_test_1' } },
      })
      await handleWebhookEvent(Buffer.from(payload), sign(payload))

      const sub = await getCurrentSubscription(ws)
      expect(sub.status).toBe('canceled')
    })
  })

  describe('checkTrialsEndingSoon', () => {
    const reminderWs = 'test-billing-reminder-ws'
    const reminderUser = 'test-billing-reminder-user'

    afterAll(async () => {
      await db.delete(schema.subscriptions).where(eq(schema.subscriptions.workspaceId, reminderWs))
      await db.delete(schema.workspace_members).where(eq(schema.workspace_members.organizationId, reminderWs))
      await db.delete(schema.user).where(eq(schema.user.id, reminderUser))
    })

    it('sends once for a trial ending within the window, then dedupes on the next run', async () => {
      await db
        .insert(schema.workspaces)
        .values({ id: reminderWs, name: 'Reminder Test', slug: reminderWs, createdAt: new Date() })
        .onConflictDoNothing()
      await db
        .insert(schema.user)
        .values({ id: reminderUser, name: 'Reminder Owner', email: 'reminder-owner@example.com' })
        .onConflictDoNothing()
      await db
        .insert(schema.workspace_members)
        .values({
          id: `${reminderWs}-m`,
          organizationId: reminderWs,
          userId: reminderUser,
          role: 'owner',
          createdAt: new Date(),
        })
        .onConflictDoNothing()

      await startTrial(reminderWs)
      // startTrial sets a 14-day trial — pull it inside the 3-day reminder window for this test.
      await db
        .update(schema.subscriptions)
        .set({ trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) })
        .where(eq(schema.subscriptions.workspaceId, reminderWs))

      const first = await checkTrialsEndingSoon(3)
      expect(first.remindersSent).toBeGreaterThanOrEqual(1)

      const second = await checkTrialsEndingSoon(3)
      expect(second.remindersSent).toBe(0) // trialReminderSentAt now set — no duplicate send.
    })
  })
})
