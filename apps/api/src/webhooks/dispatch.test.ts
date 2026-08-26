import { createServer, type Server } from 'node:http'
import { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { encryptToken } from '../crypto.js'
import { verify } from './signing.js'
import {
  FAILURE_LIMIT,
  MAX_ATTEMPTS,
  enqueueWebhookDeliveries,
  nextAttemptDelayMs,
  runWebhookDeliverySweep,
} from './dispatch.js'

// Integration: requires Neon (dev stack up), same as billing.test.ts.
//
// Endpoint rows are inserted DIRECTLY rather than through `createWebhookEndpoint`, because that
// function rightly refuses anything but https and these tests need a real local listener. URL
// validation is covered where it lives, in the endpoints layer.

interface Received {
  headers: Record<string, string | string[] | undefined>
  body: string
}

/** A listener that records what it received and answers with `status`. */
async function startServer(status: number): Promise<{ url: string; received: Received[]; close: () => Promise<void> }> {
  const received: Received[] = []
  const server: Server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      received.push({ headers: req.headers, body })
      res.writeHead(status)
      res.end()
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}/hook`,
    received,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

/** A listener that accepts the connection and never answers — the slow-endpoint case. */
async function startBlackHole(): Promise<{ url: string; close: () => Promise<void> }> {
  const sockets = new Set<import('node:net').Socket>()
  const server: Server = createServer(() => {
    /* deliberately never responds */
  })
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}/hook`,
    close: async () => {
      for (const socket of sockets) socket.destroy()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

const ws = 'test-webhooks-ws'
const SECRET = 'whsec_test_dispatch_secret'

async function insertEndpoint(url: string, eventTypes: string[] = ['*']): Promise<string> {
  const [row] = await db
    .insert(schema.webhookEndpoints)
    .values({ workspaceId: ws, url, eventTypes, secretEncrypted: encryptToken(SECRET) })
    .returning({ id: schema.webhookEndpoints.id })
  return row!.id
}

async function deliveriesFor(endpointId: string) {
  return db
    .select()
    .from(schema.webhookDeliveries)
    .where(eq(schema.webhookDeliveries.endpointId, endpointId))
}

/**
 * Makes every pending/failed delivery due now, standing in for the passage of backoff time.
 *
 * Backdated by a whole minute rather than a second: the sweep compares against the DATABASE clock,
 * which on this Neon instance runs about a second ahead of the Node process, so a one-second
 * backdate from here is not reliably in the past over there.
 */
async function makeAllDue(): Promise<void> {
  await db
    .update(schema.webhookDeliveries)
    .set({ nextAttemptAt: new Date(Date.now() - 60_000) })
    .where(eq(schema.webhookDeliveries.workspaceId, ws))
}

describe('webhook dispatch', () => {
  beforeAll(async () => {
    // TOKEN_ENCRYPTION_KEY is required by crypto.ts; the dev .env supplies it, but fail loudly
    // rather than encrypting under a silently-absent key.
    if (!process.env.TOKEN_ENCRYPTION_KEY) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be set to run webhook dispatch tests')
    }
  })

  afterEach(async () => {
    await db.delete(schema.webhookDeliveries).where(eq(schema.webhookDeliveries.workspaceId, ws))
    await db.delete(schema.webhookEndpoints).where(eq(schema.webhookEndpoints.workspaceId, ws))
  })

  afterAll(async () => {
    await db.delete(schema.webhookDeliveries).where(eq(schema.webhookDeliveries.workspaceId, ws))
    await db.delete(schema.webhookEndpoints).where(eq(schema.webhookEndpoints.workspaceId, ws))
  })

  describe('enqueue', () => {
    it('writes one pending row per subscribed endpoint and none for unsubscribed types', async () => {
      const wildcard = await insertEndpoint('https://example.test/all', ['*'])
      const specific = await insertEndpoint('https://example.test/recs', ['recommendation:new'])
      const other = await insertEndpoint('https://example.test/jobs', ['job:complete'])

      const written = await enqueueWebhookDeliveries({
        type: 'recommendation:new',
        workspaceId: ws,
        payload: { id: 'rec_1' },
      })

      expect(written).toBe(2)
      expect(await deliveriesFor(wildcard)).toHaveLength(1)
      expect(await deliveriesFor(specific)).toHaveLength(1)
      expect(await deliveriesFor(other)).toHaveLength(0)

      const [row] = await deliveriesFor(wildcard)
      expect(row!.status).toBe('pending')
      expect(row!.attempts).toBe(0)
      expect(row!.payload).toEqual({
        type: 'recommendation:new',
        workspaceId: ws,
        data: { id: 'rec_1' },
      })
    })

    it('skips disabled endpoints', async () => {
      const endpointId = await insertEndpoint('https://example.test/off')
      await db
        .update(schema.webhookEndpoints)
        .set({ enabled: false, disabledAt: new Date() })
        .where(eq(schema.webhookEndpoints.id, endpointId))

      expect(await enqueueWebhookDeliveries({ type: 'job:complete', workspaceId: ws })).toBe(0)
    })

    it('does not reach into another workspace', async () => {
      await insertEndpoint('https://example.test/ours')
      expect(
        await enqueueWebhookDeliveries({ type: 'job:complete', workspaceId: 'some-other-ws' }),
      ).toBe(0)
    })
  })

  describe('delivery', () => {
    it('POSTs a signed, verifiable request and marks the delivery delivered', async () => {
      const server = await startServer(200)
      try {
        const endpointId = await insertEndpoint(server.url)
        await enqueueWebhookDeliveries({ type: 'recommendation:new', workspaceId: ws, payload: { id: 'rec_9' } })

        const result = await runWebhookDeliverySweep()
        expect(result.delivered).toBe(1)

        expect(server.received).toHaveLength(1)
        const req = server.received[0]!

        // The receiving end verifies the signature over the exact bytes it was sent — the whole
        // point of the scheme, checked end to end rather than against our own serializer.
        const ok = verify(
          SECRET,
          req.headers['webhook-id'] as string,
          Number(req.headers['webhook-timestamp']),
          Buffer.from(req.body, 'utf8'),
          req.headers['webhook-signature'] as string,
        )
        expect(ok).toBe(true)
        expect(JSON.parse(req.body)).toMatchObject({ type: 'recommendation:new', workspaceId: ws })

        const [row] = await deliveriesFor(endpointId)
        expect(row!.status).toBe('delivered')
        expect(row!.attempts).toBe(1)
        expect(row!.lastStatusCode).toBe(200)
        expect(row!.deliveredAt).not.toBeNull()
      } finally {
        await server.close()
      }
    }, 30000)

    it('uses the delivery id as webhook-id, so a retry is idempotent for the consumer', async () => {
      const server = await startServer(200)
      try {
        const endpointId = await insertEndpoint(server.url)
        await enqueueWebhookDeliveries({ type: 'job:complete', workspaceId: ws })
        await runWebhookDeliverySweep()

        const [row] = await deliveriesFor(endpointId)
        expect(server.received[0]!.headers['webhook-id']).toBe(row!.id)
      } finally {
        await server.close()
      }
    }, 30000)

    it('retries a 500 rather than giving up, and records why', async () => {
      const server = await startServer(500)
      try {
        const endpointId = await insertEndpoint(server.url)
        await enqueueWebhookDeliveries({ type: 'job:failed', workspaceId: ws })

        const result = await runWebhookDeliverySweep()
        expect(result.failed).toBe(1)

        const [row] = await deliveriesFor(endpointId)
        expect(row!.status).toBe('failed') // not terminal — it will be retried
        expect(row!.attempts).toBe(1)
        expect(row!.lastStatusCode).toBe(500)
        expect(row!.lastError).toBe('HTTP 500')
        expect(row!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now())
      } finally {
        await server.close()
      }
    }, 30000)

    it('leaves a delivery alone until its backoff has elapsed', async () => {
      const server = await startServer(500)
      try {
        await insertEndpoint(server.url)
        await enqueueWebhookDeliveries({ type: 'job:failed', workspaceId: ws })
        await runWebhookDeliverySweep()
        expect(server.received).toHaveLength(1)

        // Second sweep with no time passed: the row is not due, so nothing is sent.
        const second = await runWebhookDeliverySweep()
        expect(second).toEqual({ delivered: 0, failed: 0 })
        expect(server.received).toHaveLength(1)
      } finally {
        await server.close()
      }
    }, 30000)

    it('gives up after MAX_ATTEMPTS and counts one failure against the endpoint', async () => {
      const server = await startServer(500)
      try {
        const endpointId = await insertEndpoint(server.url)
        await enqueueWebhookDeliveries({ type: 'job:failed', workspaceId: ws })

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          await makeAllDue()
          await runWebhookDeliverySweep()
        }

        const [row] = await deliveriesFor(endpointId)
        expect(row!.attempts).toBe(MAX_ATTEMPTS)
        expect(row!.status).toBe('exhausted')
        expect(server.received).toHaveLength(MAX_ATTEMPTS)

        // One EXHAUSTED delivery is one strike, not one per attempt — otherwise an endpoint would
        // be disabled after four bad events instead of twenty.
        const [endpoint] = await db
          .select()
          .from(schema.webhookEndpoints)
          .where(eq(schema.webhookEndpoints.id, endpointId))
        expect(endpoint!.consecutiveFailures).toBe(1)
        expect(endpoint!.enabled).toBe(true)

        // And an exhausted delivery is genuinely terminal: another due sweep must not resend it.
        await makeAllDue()
        await runWebhookDeliverySweep()
        expect(server.received).toHaveLength(MAX_ATTEMPTS)
      } finally {
        await server.close()
      }
    }, 60000)

    it('disables an endpoint once it reaches the consecutive-failure limit', async () => {
      const server = await startServer(500)
      try {
        const endpointId = await insertEndpoint(server.url)
        // Start one short of the limit rather than driving 20 real failures — the increment and the
        // threshold are what this asserts, not arithmetic already covered above.
        await db
          .update(schema.webhookEndpoints)
          .set({ consecutiveFailures: FAILURE_LIMIT - 1 })
          .where(eq(schema.webhookEndpoints.id, endpointId))

        await enqueueWebhookDeliveries({ type: 'job:failed', workspaceId: ws })
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          await makeAllDue()
          await runWebhookDeliverySweep()
        }

        const [endpoint] = await db
          .select()
          .from(schema.webhookEndpoints)
          .where(eq(schema.webhookEndpoints.id, endpointId))
        expect(endpoint!.consecutiveFailures).toBe(FAILURE_LIMIT)
        expect(endpoint!.enabled).toBe(false)
        expect(endpoint!.disabledAt).not.toBeNull()
      } finally {
        await server.close()
      }
    }, 60000)

    it('clears the failure streak on any success', async () => {
      const server = await startServer(200)
      try {
        const endpointId = await insertEndpoint(server.url)
        await db
          .update(schema.webhookEndpoints)
          .set({ consecutiveFailures: 7 })
          .where(eq(schema.webhookEndpoints.id, endpointId))

        await enqueueWebhookDeliveries({ type: 'job:complete', workspaceId: ws })
        await runWebhookDeliverySweep()

        const [endpoint] = await db
          .select()
          .from(schema.webhookEndpoints)
          .where(eq(schema.webhookEndpoints.id, endpointId))
        expect(endpoint!.consecutiveFailures).toBe(0)
      } finally {
        await server.close()
      }
    }, 30000)

    it('retires a queued delivery whose endpoint was disabled in the meantime', async () => {
      const server = await startServer(200)
      try {
        const endpointId = await insertEndpoint(server.url)
        await enqueueWebhookDeliveries({ type: 'job:complete', workspaceId: ws })
        await db
          .update(schema.webhookEndpoints)
          .set({ enabled: false, disabledAt: new Date() })
          .where(eq(schema.webhookEndpoints.id, endpointId))

        await runWebhookDeliverySweep()

        expect(server.received).toHaveLength(0)
        const [row] = await deliveriesFor(endpointId)
        expect(row!.status).toBe('exhausted')
        expect(row!.lastError).toBe('Endpoint disabled before delivery')
      } finally {
        await server.close()
      }
    }, 30000)

    // The isolation guarantee, exercised against the case that actually threatens it: an endpoint
    // that accepts the connection and then never answers. This test really does wait out the 10s
    // request timeout — that is the point, and why its own timeout is generous.
    it('a hanging endpoint does not stop the others from being delivered', async () => {
      const good = await startServer(200)
      const blackHole = await startBlackHole()
      try {
        const goodId = await insertEndpoint(good.url)
        const badId = await insertEndpoint(blackHole.url)
        await enqueueWebhookDeliveries({ type: 'analytics:mer_alert', workspaceId: ws })

        const result = await runWebhookDeliverySweep()

        expect(result).toEqual({ delivered: 1, failed: 1 })
        expect(good.received).toHaveLength(1)

        const [goodRow] = await deliveriesFor(goodId)
        expect(goodRow!.status).toBe('delivered')

        const [badRow] = await deliveriesFor(badId)
        expect(badRow!.status).toBe('failed')
        expect(badRow!.lastStatusCode).toBeNull() // never got a response at all
        expect(badRow!.lastError).toBeTruthy()
      } finally {
        await good.close()
        await blackHole.close()
      }
    }, 60000)
  })

  describe('backoff', () => {
    it('advances through the schedule and then holds at the last step', () => {
      const noJitter = () => 0.5 // the midpoint of the +/-20% band, i.e. exactly the base delay
      expect(nextAttemptDelayMs(0, noJitter)).toBe(10_000)
      expect(nextAttemptDelayMs(1, noJitter)).toBe(60_000)
      expect(nextAttemptDelayMs(2, noJitter)).toBe(300_000)
      expect(nextAttemptDelayMs(3, noJitter)).toBe(1_800_000)
      expect(nextAttemptDelayMs(4, noJitter)).toBe(7_200_000)
      // Past the end of the schedule it clamps rather than reading undefined and producing NaN,
      // which would write an Invalid Date into next_attempt_at and strand the delivery.
      expect(nextAttemptDelayMs(99, noJitter)).toBe(7_200_000)
    })

    it('jitters within +/-20% so a failing endpoint does not get a synchronised retry burst', () => {
      expect(nextAttemptDelayMs(0, () => 0)).toBe(8_000)
      expect(nextAttemptDelayMs(0, () => 1)).toBe(12_000)

      const spread = new Set(Array.from({ length: 50 }, () => nextAttemptDelayMs(1)))
      expect(spread.size).toBeGreaterThan(1)
      for (const delay of spread) {
        expect(delay).toBeGreaterThanOrEqual(48_000)
        expect(delay).toBeLessThanOrEqual(72_000)
      }
    })
  })

  describe('secret handling', () => {
    it('never stores the signing secret in plaintext', async () => {
      const endpointId = await insertEndpoint('https://example.test/secret')
      const [row] = await db
        .select()
        .from(schema.webhookEndpoints)
        .where(and(eq(schema.webhookEndpoints.id, endpointId), eq(schema.webhookEndpoints.workspaceId, ws)))

      expect(row!.secretEncrypted).not.toContain(SECRET)
      // base64(iv).base64(tag).base64(ciphertext) — the crypto.ts envelope.
      expect(row!.secretEncrypted.split('.')).toHaveLength(3)
    })
  })
})
