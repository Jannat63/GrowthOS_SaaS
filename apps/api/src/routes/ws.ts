import type { FastifyInstance } from 'fastify'
import websocketPlugin from '@fastify/websocket'
import { AppError } from '../errors.js'
import { getSessionUser } from '../auth-context.js'
import { requireWorkspaceMember } from '../guards.js'
import { subscribeSocket, unsubscribeSocket, startWsRedisSubscriber } from '../ws.js'

/**
 * `GET /api/v1/workspaces/:id/ws` — upgrades to a WebSocket, authenticated with the same cookie
 * session every other route uses (the upgrade request carries cookies same as any HTTP request;
 * Better Auth's session lookup works identically here). `client`-level read access, matching the
 * other routes that read this same data (branding, PDF reports).
 *
 * Auth runs in `preHandler`, which Fastify runs BEFORE the WS upgrade handshake completes — not
 * in the websocket handler itself, which only runs after the client has already seen the
 * connection open. Doing it there would mean rejecting an unauthorized client by opening the
 * socket and immediately closing it, rather than cleanly failing the handshake itself. A real
 * client (`ws` npm package) confirmed this distinction: opening-then-closing fires the client's
 * `open` event before the rejection is visible, but preHandler-based rejection fails the upgrade
 * outright, so `open` never fires for an unauthorized request.
 *
 * On successful auth, the socket joins its workspace's room (see ws.ts) and receives every event
 * published for that workspace until it disconnects. No client->server messages are expected or
 * handled — this is a one-way server->client push channel.
 */
export async function registerWsRoutes(app: FastifyInstance) {
  await app.register(websocketPlugin)
  startWsRedisSubscriber()

  app.get(
    '/api/v1/workspaces/:id/ws',
    {
      websocket: true,
      preHandler: async (request) => {
        const { id } = request.params as { id: string }
        const user = await getSessionUser(request)
        if (!user) {
          throw new AppError('UNAUTHORIZED', 'You must be signed in.')
        }
        await requireWorkspaceMember(user.id, id, 'client')
      },
    },
    (socket, request) => {
      const { id } = request.params as { id: string }
      subscribeSocket(id, socket)
      socket.send(JSON.stringify({ type: 'connected', workspaceId: id }))
      socket.on('close', () => unsubscribeSocket(id, socket))
    },
  )
}
