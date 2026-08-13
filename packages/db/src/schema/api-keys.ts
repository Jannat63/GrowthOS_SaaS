import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

/**
 * Public API keys (M4 P4.4 — the buildable half; see docs/plan/M4-v2-automation/progress.md).
 * Gated behind the `apiAccess` plan feature (Scale tier — see @growthos/types PLAN_LIMITS),
 * checked via plan-limits.ts `assertFeatureEnabled` at creation time.
 *
 * Only a SHA-256 hash of the key is ever stored — the plaintext is shown exactly once, at
 * creation, and never again (same principle as password storage). `keyPrefix` is the first 12
 * characters of the plaintext (e.g. `gos_live_ab3f`), stored separately so the UI can show
 * "which key is this" without ever re-displaying the full secret.
 *
 * workspaceId is app-layer enforced (no FK — see tenancy.ts).
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    name: text('name').notNull(), // user-supplied label, e.g. "Zapier integration"
    keyHash: text('key_hash').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    createdBy: text('created_by'), // → user.id; who generated it
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique('api_keys_key_hash_uidx').on(t.keyHash),
    index('idx_api_keys_workspace').on(t.workspaceId),
  ],
)
