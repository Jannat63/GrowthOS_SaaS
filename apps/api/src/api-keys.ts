import { randomBytes, createHash } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { AppError } from './errors.js'
import { assertFeatureEnabled } from './plan-limits.js'

/**
 * Public API keys (M4 P4.4 — the buildable half of "GEO tracking + public API"; GEO/AI-citation
 * tracking itself needs external access this codebase doesn't have — see GO_LIVE_CHECKLIST.md §2.
 * The public REST API has no such dependency: it's read access to data the app already computes,
 * gated behind the `apiAccess` plan feature (Scale tier).
 *
 * Only a SHA-256 hash of the key is ever persisted. The plaintext is generated, returned once from
 * `createApiKey`, and never stored or retrievable again — same principle as password handling.
 */

const KEY_PREFIX = 'gos_live_'

function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

export interface CreatedApiKey {
  id: string
  name: string
  plaintext: string // shown once — caller must display this immediately and never re-fetch it
  keyPrefix: string
  createdAt: Date | null
}

/** Creates a new key. Requires the `apiAccess` plan feature (Scale tier) — throws PLAN_LIMIT_REACHED (402) otherwise. */
export async function createApiKey(
  workspaceId: string,
  name: string,
  createdBy: string,
): Promise<CreatedApiKey> {
  await assertFeatureEnabled(workspaceId, 'apiAccess')

  const plaintext = `${KEY_PREFIX}${randomBytes(24).toString('hex')}`
  const keyHash = hashApiKey(plaintext)
  const keyPrefix = plaintext.slice(0, 16)

  const [row] = await db
    .insert(schema.apiKeys)
    .values({ workspaceId, name, keyHash, keyPrefix, createdBy })
    .returning({ id: schema.apiKeys.id, createdAt: schema.apiKeys.createdAt })

  return { id: row!.id, name, plaintext, keyPrefix, createdAt: row!.createdAt }
}

export interface ApiKeySummary {
  id: string
  name: string
  keyPrefix: string
  createdAt: Date | null
  lastUsedAt: Date | null
  revokedAt: Date | null
}

/** Metadata only — the hash is never selected here, let alone the plaintext (which isn't stored at all). */
export async function listApiKeys(workspaceId: string): Promise<ApiKeySummary[]> {
  return db
    .select({
      id: schema.apiKeys.id,
      name: schema.apiKeys.name,
      keyPrefix: schema.apiKeys.keyPrefix,
      createdAt: schema.apiKeys.createdAt,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      revokedAt: schema.apiKeys.revokedAt,
    })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.workspaceId, workspaceId))
}

export async function revokeApiKey(workspaceId: string, keyId: string): Promise<void> {
  const result = await db
    .update(schema.apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.apiKeys.id, keyId), eq(schema.apiKeys.workspaceId, workspaceId), isNull(schema.apiKeys.revokedAt)))
    .returning({ id: schema.apiKeys.id })

  if (result.length === 0) {
    throw new AppError('NOT_FOUND', 'API key not found, already revoked, or belongs to a different workspace.')
  }
}

/**
 * Resolves a plaintext key (from an incoming `Authorization: Bearer ...` header) to its
 * workspace. Returns null for anything invalid — an unrecognized, revoked key, or a workspace
 * whose plan no longer includes API access (e.g. downgraded after the key was issued). Updates
 * `lastUsedAt` best-effort on success; a failed update never blocks the request it's serving.
 */
export async function resolveApiKey(plaintext: string): Promise<{ workspaceId: string; keyId: string } | null> {
  if (!plaintext.startsWith(KEY_PREFIX)) return null

  const [row] = await db
    .select({ id: schema.apiKeys.id, workspaceId: schema.apiKeys.workspaceId, revokedAt: schema.apiKeys.revokedAt })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyHash, hashApiKey(plaintext)))
    .limit(1)

  if (!row || row.revokedAt) return null

  try {
    await assertFeatureEnabled(row.workspaceId, 'apiAccess')
  } catch {
    return null // plan no longer includes API access
  }

  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, row.id))
    .catch(() => {}) // best-effort, never blocks the request

  return { workspaceId: row.workspaceId, keyId: row.id }
}
