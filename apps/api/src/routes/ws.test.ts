import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { WebSocket as NodeWebSocket } from 'ws'
import { buildApp } from '../app.js'
import { publish } from '../ws.js'

// Integration: requires Neon (dev stack up) — same as billing.test.ts. Boots a REAL server on a
// real port and connects a REAL WebSocket client (not app.inject(), which doesn't handle WS
// upgrades reliably) — this is the only way to genuinely verify the upgrade handshake, cookie
// auth, and message delivery all work together, not just that each piece typechecks.
describe('WebSocket connection', () => {
  const slug = `test-ws-connection-${Date.now()}`
  let app: Awaited<ReturnType<typeof buildApp>>
  let port: number
  let cookie: string
  let workspaceId: string

  afterAll(async () => {
    await app.close()
    if (workspaceId) await db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId))
  })

  it('sets up a real signed-in session and a real workspace', async () => {
    app = buildApp()
    await app.listen({ port: 0, host: '127.0.0.1' })
    const address = app.server.address()
    port = typeof address === 'object' && address ? address.port : 0
    expect(port).toBeGreaterThan(0)

    const signup = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: {
        email: `ws-test-${Date.now()}@example.com`,
        password: 'correct-horse-battery-staple',
        name: 'WS Test',
      },
      headers: { 'content-type': 'application/json' },
    })
    const setCookie = signup.headers['set-cookie']
    cookie = Array.isArray(setCookie) ? setCookie.map((c) => c.split(';')[0]).join('; ') : (setCookie as string)
    expect(cookie).toBeTruthy()

    // Through the real endpoint, not a raw DB insert — that's what makes the signed-up user a
    // member (owner) of the workspace. A workspace inserted directly has no workspace_members
    // row at all, so requireWorkspaceMember correctly 403s regardless of who's asking. Better
    // Auth's organization plugin generates its own id, distinct from the slug — capture it from
    // the response rather than assume it matches what we passed in.
    const createWs = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      payload: { name: 'WS Test', slug },
      headers: { cookie, 'content-type': 'application/json' },
    })
    expect(createWs.statusCode).toBe(201)
    workspaceId = JSON.parse(createWs.body).workspace.id
    expect(workspaceId).toBeTruthy()
  })

  it('rejects the upgrade with no session cookie — the handshake itself fails, socket never opens', async () => {
    const socket = new NodeWebSocket(`ws://127.0.0.1:${port}/api/v1/workspaces/${workspaceId}/ws`)
    let opened = false
    socket.on('open', () => {
      opened = true
    })
    await new Promise<void>((resolve) => {
      socket.on('error', () => resolve())
      socket.on('unexpected-response', (_req, res) => {
        expect(res.statusCode).toBe(401)
        resolve()
      })
      socket.on('close', () => resolve())
    })
    expect(opened).toBe(false)
  })

  it('accepts the upgrade with a valid session and delivers a published event', async () => {
    const socket = new NodeWebSocket(`ws://127.0.0.1:${port}/api/v1/workspaces/${workspaceId}/ws`, {
      headers: { cookie },
    })

    const messages: unknown[] = []
    socket.on('message', (raw) => messages.push(JSON.parse(raw.toString())))

    await new Promise<void>((resolve, reject) => {
      socket.on('open', () => resolve())
      socket.on('error', reject)
    })

    // First message should be the connection ack.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(messages).toEqual([{ type: 'connected', workspaceId }])

    // Redis is unavailable in this dev sandbox, so publish() takes its ~1.5s fallback path
    // (see ws.test.ts) before delivering locally — give it real room to do that for real.
    await publish({ type: 'recommendation:new', workspaceId, payload: { count: 3 } })
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(messages).toEqual([
      { type: 'connected', workspaceId },
      { type: 'recommendation:new', workspaceId, payload: { count: 3 } },
    ])

    socket.close()
  }, 10_000)
})
