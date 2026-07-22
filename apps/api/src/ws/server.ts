import type { FastifyInstance } from 'fastify'
import { Redis } from 'ioredis'
import websocket from '@fastify/websocket'
import { getSessionUser } from '../auth-context.js'
import { requireWorkspaceMember } from '../guards.js'
import { RoomRegistry } from './rooms.js'
import { WS_CHANNEL, type WsEnvelope } from './events.js'

// Close codes in the private range (4000–4999) so the client can tell auth failures apart.
const CLOSE_UNAUTHENTICATED = 4401
const CLOSE_FORBIDDEN = 4403

/**
 * Real-time WebSocket layer (GET /api/v1/ws). Authenticates the Better Auth session on
 * connect, then lets the client subscribe to one workspace room at a time. A single Redis
 * subscriber per process fans `ws:events` out to the matching room — so any API process or
 * the Python worker can `publish` an event and every connected client sees it.
 */
export async function registerWebSocket(app: FastifyInstance): Promise<void> {
  await app.register(websocket)

  const rooms = new RoomRegistry()

  // One dedicated subscriber connection for the whole process (ioredis requires a separate
  // client for subscribe mode). Reuses REDIS_URL like the job-bridge publisher. lazyConnect
  // keeps buildApp()/inject() from opening a socket at boot, and subscribe() is fire-and-forget
  // so an unavailable Redis degrades to "no cross-process events" instead of failing startup.
  const sub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  })
  sub.on('message', (_channel, raw) => {
    try {
      const { workspaceId } = JSON.parse(raw) as WsEnvelope
      // Re-broadcast the exact wire payload; the client parses `event` off it.
      rooms.broadcast(workspaceId, raw)
    } catch (err) {
      app.log.warn({ err }, 'dropping malformed ws envelope')
    }
  })
  sub.subscribe(WS_CHANNEL).catch((err) => {
    app.log.warn({ err }, 'ws subscriber could not reach Redis — real-time fan-out disabled')
  })

  // Tear the subscriber down with the server so tests and restarts don't leak connections.
  app.addHook('onClose', async () => {
    await sub.quit().catch(() => {})
  })

  app.register(async (scoped) => {
    scoped.get('/api/v1/ws', { websocket: true }, async (socket, request) => {
      const user = await getSessionUser(request)
      if (!user) {
        socket.close(CLOSE_UNAUTHENTICATED, 'unauthenticated')
        return
      }

      socket.on('message', async (data: Buffer) => {
        let msg: { subscribe?: string }
        try {
          msg = JSON.parse(data.toString())
        } catch {
          return // ignore malformed client frames
        }
        if (typeof msg.subscribe === 'string') {
          try {
            await requireWorkspaceMember(user.id, msg.subscribe)
          } catch {
            socket.close(CLOSE_FORBIDDEN, 'not a workspace member')
            return
          }
          rooms.join(msg.subscribe, socket)
          socket.send(JSON.stringify({ type: 'subscribed', workspaceId: msg.subscribe }))
        }
      })

      socket.on('close', () => rooms.leave(socket))
      socket.on('error', () => rooms.leave(socket))
    })
  })
}
