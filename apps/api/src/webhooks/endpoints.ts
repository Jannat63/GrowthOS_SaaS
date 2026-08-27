import { randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { AppError } from '../errors.js'
import { encryptToken } from '../crypto.js'
import { assertFeatureEnabled } from '../plan-limits.js'
import { assertDeliverableUrl } from './url-guard.js'
import type { WsEventType } from '../ws.js'

/**
 * Webhook endpoint management (M4 · P4.4a-2).
 *
 * Gated behind `apiAccess` (Scale tier) — the same gate as API keys, because webhooks are the push
 * half of the same product.
 *
 * The signing secret is generated server-side, encrypted at rest with the same AES-256-GCM helper
 * that protects OAuth tokens, returned exactly once at creation, and never selected by any read
 * path. It is decrypted only inside the dispatcher, at the moment of signing.
 */

const SECRET_PREFIX = 'whsec_'

/** Every event the WebSocket bus publishes. `*` subscribes to all of them, including future ones. */
export const SUBSCRIBABLE_EVENTS: WsEventType[] = [
  'recommendation:new',
  'job:complete',
  'job:failed',
  'meta:fatigue_alert',
  'analytics:mer_alert',
  'intelligence:report_ready',
]

export interface CreatedWebhookEndpoint {
  id: string
  url: string
  eventTypes: string[]
  secret: string // shown once — the caller must display this immediately and can never re-fetch it
  createdAt: Date
}

export interface WebhookEndpointSummary {
  id: string
  url: string
  eventTypes: string[]
  enabled: boolean
  consecutiveFailures: number
  disabledAt: Date | null
  createdAt: Date
}

function assertValidEventTypes(eventTypes: string[]): void {
  if (eventTypes.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Subscribe to at least one event type, or use "*".')
  }
  const unknown = eventTypes.filter(
    (t) => t !== '*' && !SUBSCRIBABLE_EVENTS.includes(t as WsEventType),
  )
  if (unknown.length > 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Unknown event type(s): ${unknown.join(', ')}. Valid types: ${['*', ...SUBSCRIBABLE_EVENTS].join(', ')}.`,
    )
  }
}

export async function createWebhookEndpoint(
  workspaceId: string,
  url: string,
  eventTypes: string[],
  createdBy: string,
): Promise<CreatedWebhookEndpoint> {
  await assertFeatureEnabled(workspaceId, 'apiAccess')
  // https + not an internal address. See url-guard.ts: this is the SSRF control, and it is
  // re-checked at delivery time too, because a creation-time check alone is defeated by DNS
  // rebinding.
  await assertDeliverableUrl(url)
  assertValidEventTypes(eventTypes)

  const secret = `${SECRET_PREFIX}${randomBytes(24).toString('base64url')}`

  const [row] = await db
    .insert(schema.webhookEndpoints)
    .values({ workspaceId, url, eventTypes, secretEncrypted: encryptToken(secret), createdBy })
    .returning({ id: schema.webhookEndpoints.id, createdAt: schema.webhookEndpoints.createdAt })

  return { id: row!.id, url, eventTypes, secret, createdAt: row!.createdAt }
}

/** Metadata only. `secretEncrypted` is never selected here — see the note at the top of this file. */
export async function listWebhookEndpoints(workspaceId: string): Promise<WebhookEndpointSummary[]> {
  return db
    .select({
      id: schema.webhookEndpoints.id,
      url: schema.webhookEndpoints.url,
      eventTypes: schema.webhookEndpoints.eventTypes,
      enabled: schema.webhookEndpoints.enabled,
      consecutiveFailures: schema.webhookEndpoints.consecutiveFailures,
      disabledAt: schema.webhookEndpoints.disabledAt,
      createdAt: schema.webhookEndpoints.createdAt,
    })
    .from(schema.webhookEndpoints)
    .where(eq(schema.webhookEndpoints.workspaceId, workspaceId))
}

/**
 * Deletes an endpoint. Scoped by workspace in the WHERE clause rather than by a read-then-check:
 * the id alone is enough to address a row, so scoping anywhere but the query itself leaves a window
 * where one workspace can delete another's endpoint by guessing a uuid.
 */
export async function deleteWebhookEndpoint(workspaceId: string, endpointId: string): Promise<void> {
  const deleted = await db
    .delete(schema.webhookEndpoints)
    .where(
      and(
        eq(schema.webhookEndpoints.id, endpointId),
        eq(schema.webhookEndpoints.workspaceId, workspaceId),
      ),
    )
    .returning({ id: schema.webhookEndpoints.id })

  if (deleted.length === 0) {
    throw new AppError('NOT_FOUND', 'Webhook endpoint not found.')
  }
}

/**
 * Re-enables an endpoint that was auto-disabled after repeated failures, resetting its failure
 * count. Without this a customer who fixes their listener has no way back short of recreating the
 * endpoint — which would rotate the secret and mean redeploying their verifier too.
 */
export async function enableWebhookEndpoint(
  workspaceId: string,
  endpointId: string,
): Promise<WebhookEndpointSummary> {
  const [row] = await db
    .update(schema.webhookEndpoints)
    .set({ enabled: true, disabledAt: null, consecutiveFailures: 0 })
    .where(
      and(
        eq(schema.webhookEndpoints.id, endpointId),
        eq(schema.webhookEndpoints.workspaceId, workspaceId),
      ),
    )
    .returning({
      id: schema.webhookEndpoints.id,
      url: schema.webhookEndpoints.url,
      eventTypes: schema.webhookEndpoints.eventTypes,
      enabled: schema.webhookEndpoints.enabled,
      consecutiveFailures: schema.webhookEndpoints.consecutiveFailures,
      disabledAt: schema.webhookEndpoints.disabledAt,
      createdAt: schema.webhookEndpoints.createdAt,
    })

  if (!row) throw new AppError('NOT_FOUND', 'Webhook endpoint not found.')
  return row
}
