import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { encryptToken, decryptToken } from '../crypto.js'
import { getProvider, type ProviderAccount, type ProviderTokens } from './providers.js'

export type ConnectionRow = typeof schema.platformConnections.$inferSelect

// Upsert a connection after a successful token exchange (row created only post-exchange, so
// accessToken is always set — no schema migration needed). Respects unique(workspace, platform, account).
export async function upsertConnection(input: {
  workspaceId: string
  platform: string
  account: ProviderAccount
  tokens: ProviderTokens
}): Promise<string> {
  const encAccess = encryptToken(input.tokens.accessToken)
  const encRefresh = input.tokens.refreshToken ? encryptToken(input.tokens.refreshToken) : null
  const [row] = await db
    .insert(schema.platformConnections)
    .values({
      workspaceId: input.workspaceId,
      platform: input.platform,
      accountId: input.account.accountId,
      accountName: input.account.accountName,
      accessToken: encAccess,
      refreshToken: encRefresh,
      tokenExpiresAt: input.tokens.expiresAt,
      scopes: input.tokens.scopes,
      metadata: input.account.metadata,
      isActive: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        schema.platformConnections.workspaceId,
        schema.platformConnections.platform,
        schema.platformConnections.accountId,
      ],
      set: {
        accountName: input.account.accountName,
        accessToken: encAccess,
        refreshToken: encRefresh,
        tokenExpiresAt: input.tokens.expiresAt,
        scopes: input.tokens.scopes,
        metadata: input.account.metadata,
        isActive: true,
        syncError: null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: schema.platformConnections.id })
  return row!.id
}

export async function getConnection(
  workspaceId: string,
  connectionId: string,
): Promise<ConnectionRow | undefined> {
  const [row] = await db
    .select()
    .from(schema.platformConnections)
    .where(
      and(
        eq(schema.platformConnections.id, connectionId),
        eq(schema.platformConnections.workspaceId, workspaceId),
      ),
    )
  return row
}

// Decrypt the access token; if expired (or within 60s), refresh via the provider and persist. Model
// after Better Auth's getAccessToken auto-refresh.
export async function getValidAccessToken(conn: ConnectionRow): Promise<string> {
  const expiringSoon = conn.tokenExpiresAt
    ? conn.tokenExpiresAt.getTime() < Date.now() + 60_000
    : false
  if (!expiringSoon || !conn.refreshToken) return decryptToken(conn.accessToken)

  const refreshed = await getProvider(conn.platform).refreshAccessToken(
    decryptToken(conn.refreshToken),
  )
  await db
    .update(schema.platformConnections)
    .set({
      accessToken: encryptToken(refreshed.accessToken),
      tokenExpiresAt: refreshed.expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.platformConnections.id, conn.id))
  return refreshed.accessToken
}
