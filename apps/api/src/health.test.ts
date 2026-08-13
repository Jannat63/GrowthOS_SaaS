import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

// Integration: exercises the readiness probes against the real dev stack (Neon, Redis, ClickHouse).
// `/health` must stay dependency-free; `/health/ready` is the one a monitor points at.

const app = buildApp()

afterAll(async () => {
  await app.close()
})

describe('health endpoints', () => {
  it('liveness answers without touching any dependency', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('ok')
    // Deliberately has no `checks`: a database blip must never make an orchestrator kill a healthy
    // process.
    expect(body.checks).toBeUndefined()
  })

  it('readiness reports each dependency by name', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' })
    const body = JSON.parse(res.body)

    expect(Object.keys(body.checks).sort()).toEqual(['clickhouse', 'database', 'redis'])
    for (const check of Object.values(body.checks) as { status: string; ms: number }[]) {
      expect(['ok', 'error']).toContain(check.status)
      expect(typeof check.ms).toBe('number')
    }
  })

  it('answers 200/ok only when every dependency is reachable, 503/degraded otherwise', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' })
    const body = JSON.parse(res.body)
    const anyFailed = Object.values(body.checks).some(
      (c) => (c as { status: string }).status !== 'ok',
    )

    // Asserted as a relationship rather than a fixed expectation, so this test is meaningful whether
    // or not the local stack happens to be running — what must hold is that the status code and the
    // summary never disagree with the individual probes.
    expect(body.status).toBe(anyFailed ? 'degraded' : 'ok')
    expect(res.statusCode).toBe(anyFailed ? 503 : 200)

    // A failing probe must say why; that named culprit is the whole point of the endpoint.
    for (const check of Object.values(body.checks) as { status: string; error?: string }[]) {
      if (check.status === 'error') expect(check.error).toBeTruthy()
    }
  })
})
