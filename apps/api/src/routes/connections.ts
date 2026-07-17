import type { FastifyInstance } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { AppError } from '../errors.js'
import { requireUser } from '../auth-context.js'
import { requireWorkspaceMember } from '../guards.js'
import { getProvider } from '../oauth/providers.js'
import { signState, verifyState } from '../oauth/state.js'
import { upsertConnection, getConnection } from '../oauth/connections.js'
import { syncGscConnection } from '../gsc-sync.js'

function redirectUri(): string {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI ?? 'http://localhost:3001/api/v1/oauth/callback'
}
function webOrigin(): string {
  return process.env.WEB_ORIGIN ?? 'http://localhost:3000'
}

/** Real platform OAuth connect/callback/disconnect/sync (M3 P3.0). Registered alongside registerV1Routes. */
export async function registerConnectionRoutes(app: FastifyInstance) {
  // Initiate connect — return the provider authorize URL for the client to redirect to.
  app.get('/api/v1/workspaces/:id/connections/:platform/connect', async (request) => {
    const user = await requireUser(request)
    const { id, platform } = request.params as { id: string; platform: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const provider = getProvider(platform) // throws for unsupported platform
    const state = signState({ workspaceId: id, platform })
    return { url: provider.authorizeUrl(state, redirectUri()) }
  })

  // OAuth callback (public redirect target). State (HMAC-signed) carries workspaceId + platform.
  app.get('/api/v1/oauth/callback', async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string }
    const web = webOrigin()
    if (error || !code || !state) return reply.redirect(`${web}/settings?connect_error=1`)

    let parsed
    try {
      parsed = verifyState(state)
    } catch {
      return reply.redirect(`${web}/settings?connect_error=state`)
    }

    try {
      const provider = getProvider(parsed.platform)
      const tokens = await provider.exchangeCode(code, redirectUri())
      const accounts = await provider.listAccounts(tokens.accessToken)
      if (accounts.length === 0) return reply.redirect(`${web}/settings?connect_error=no_account`)
      // First site for now; multi-site selection is a later enhancement.
      const connectionId = await upsertConnection({
        workspaceId: parsed.workspaceId,
        platform: parsed.platform,
        account: accounts[0]!,
        tokens,
      })
      // Best-effort first sync (don't block the redirect).
      const conn = await getConnection(parsed.workspaceId, connectionId)
      if (conn) void syncGscConnection(conn).catch(() => {})
      return reply.redirect(`${web}/settings?connected=${parsed.platform}`)
    } catch {
      return reply.redirect(`${web}/settings?connect_error=1`)
    }
  })

  // Disconnect.
  app.delete('/api/v1/workspaces/:id/connections/:connectionId', async (request) => {
    const user = await requireUser(request)
    const { id, connectionId } = request.params as { id: string; connectionId: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const [row] = await db
      .delete(schema.platformConnections)
      .where(
        and(
          eq(schema.platformConnections.id, connectionId),
          eq(schema.platformConnections.workspaceId, id),
        ),
      )
      .returning({ id: schema.platformConnections.id })
    if (!row) throw new AppError('WORKSPACE_NOT_FOUND', 'Connection not found in this workspace.')
    return { id: connectionId, disconnected: true }
  })

  // Manual sync.
  app.post('/api/v1/workspaces/:id/connections/:connectionId/sync', async (request) => {
    const user = await requireUser(request)
    const { id, connectionId } = request.params as { id: string; connectionId: string }
    await requireWorkspaceMember(user.id, id, 'manager')
    const conn = await getConnection(id, connectionId)
    if (!conn) throw new AppError('WORKSPACE_NOT_FOUND', 'Connection not found in this workspace.')
    return syncGscConnection(conn)
  })
}
