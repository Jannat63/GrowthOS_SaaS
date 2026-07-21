import { index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

/**
 * Billing (M5 · P5.1). Mirrors Stripe — this table is a read model kept in sync by the
 * `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted`
 * webhooks (see `apps/api/src/billing.ts`). Stripe itself remains the source of truth for payment
 * state; never write payment details here.
 *
 * One row per workspace (a workspace has at most one active subscription). Before checkout
 * completes, a workspace has no row here — the app treats that as `plan: 'starter', status:
 * 'trialing'` (see `getCurrentSubscription`). workspaceId is app-layer enforced (no FK — see
 * tenancy.ts).
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    plan: text('plan').notNull(), // starter | growth | scale
    status: text('status').notNull(), // active | trialing | past_due | canceled
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAt: timestamp('cancel_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique('subscriptions_workspace_uidx').on(t.workspaceId)],
);

/**
 * Usage metering (M5 · P5.1 table; enforcement lands in P5.2). One row per
 * (workspace, metric, billing-period-start) — incremented as the workspace consumes a metered
 * feature. `period` is the first day of the billing period (UTC) so a metric's usage resets
 * cleanly each cycle. workspaceId is app-layer enforced (no FK — see tenancy.ts).
 */
export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    // keywords_tracked | ai_creatives_generated | recommendations_generated
    // | content_briefs_created | report_generated
    metric: text('metric').notNull(),
    value: integer('value').notNull().default(0),
    period: timestamp('period', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique('usage_records_workspace_metric_period_uidx').on(t.workspaceId, t.metric, t.period),
    index('idx_usage_workspace_period').on(t.workspaceId, t.period),
  ],
);
