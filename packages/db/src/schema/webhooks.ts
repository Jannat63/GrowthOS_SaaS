import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Outbound webhooks (M4 · P4.4a-2) — the push half of the public API.
 *
 * The public API is read-only and poll-based: a customer wanting to react to a new recommendation
 * has to poll on a timer. The app already knows the moment one is created, because it publishes to
 * the WebSocket bus — but that transport is browser-only and cookie-authenticated, so no
 * server-side integration can consume it. These two tables are the server-to-server transport over
 * the same event bus.
 *
 * Gated behind the `apiAccess` plan feature (Scale tier), the same gate as API keys.
 *
 * `workspaceId` has no DB-level FK (same rationale as ./tenancy.ts — app-layer isolation).
 */
export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    url: text('url').notNull(), // https only, validated on write
    /**
     * The signing secret, AES-256-GCM encrypted at rest with the same `crypto.ts` helper that
     * protects OAuth tokens. Shown to the user exactly once, at creation, and never returned by any
     * read route — a webhook secret is a live credential, and anyone holding it can forge events
     * that look like ours.
     */
    secretEncrypted: text('secret_encrypted').notNull(),
    /** Subscribed event types, or `['*']` for all. Matched against `WsEvent['type']`. */
    eventTypes: text('event_types').array().notNull(),
    enabled: boolean('enabled').notNull().default(true),
    /**
     * Consecutive failed DELIVERIES, not attempts — reset to 0 by any success. At 20 the endpoint is
     * disabled and its owner emailed: a permanently dead URL should stop consuming retry budget,
     * and silently retrying forever is how a queue becomes an outage.
     */
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    createdBy: text('created_by'), // → user.id
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_webhook_endpoints_workspace').on(t.workspaceId)],
);

/**
 * The delivery ledger — one row per (event, subscribed endpoint), mirroring `automation_actions`
 * from P4.3a.
 *
 * Rows are written BEFORE anything is sent. That is what makes delivery survive a crash: the
 * process that accepted the event has already durably recorded the intent to deliver it, so a
 * restart resumes instead of losing the event. Same reasoning as the `background_jobs` fix in
 * docs/AUDIT-2026-08-13-codebase.md #4.
 */
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    endpointId: uuid('endpoint_id').notNull(),
    /** Denormalised from the endpoint so the sweep can scope by workspace without a join. */
    workspaceId: text('workspace_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    /** `pending` → `delivered`, or → `failed` between attempts, or → `exhausted` after the last. */
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastStatusCode: integer('last_status_code'),
    lastError: text('last_error'),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The sweep's only query: due, not yet terminal, oldest first.
    index('idx_webhook_deliveries_due').on(t.status, t.nextAttemptAt),
    index('idx_webhook_deliveries_endpoint').on(t.endpointId),
  ],
);
