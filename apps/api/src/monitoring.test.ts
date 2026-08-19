import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const info = vi.fn()
const warn = vi.fn()
const error = vi.fn()
vi.mock('./logger.js', () => ({
  logger: { info, warn, error, child: () => ({ info, warn, error }) },
  moduleLogger: () => ({ info, warn, error }),
}))

const {
  initMonitoring,
  captureException,
  flushMonitoring,
  __setMonitoringClientForTests,
} = await import('./monitoring.js')

// Monitoring is the layer that reports failures, so its own failure modes are the ones that must
// not bite. Every test here is about it staying silent and harmless rather than about it working.

function fakeClient() {
  return {
    init: vi.fn(),
    captureException: vi.fn(),
    flush: vi.fn().mockResolvedValue(true),
  }
}

describe('monitoring', () => {
  const originalDsn = process.env.SENTRY_DSN

  beforeEach(() => {
    info.mockReset()
    warn.mockReset()
    error.mockReset()
    __setMonitoringClientForTests(undefined)
    delete process.env.SENTRY_DSN
  })

  afterEach(() => {
    __setMonitoringClientForTests(undefined)
    if (originalDsn === undefined) delete process.env.SENTRY_DSN
    else process.env.SENTRY_DSN = originalDsn
  })

  it('stays off, and says so, when no DSN is configured', async () => {
    await expect(initMonitoring()).resolves.toBeUndefined()
    expect(info).toHaveBeenCalledWith(expect.stringContaining('not configured'))
  })

  // The state this repo is actually in: the SDK is deliberately not a dependency. Booting must not
  // fail, and the operator must be told exactly how to enable it rather than left guessing.
  it('warns with the install command when a DSN is set but the SDK is absent', async () => {
    process.env.SENTRY_DSN = 'https://public@example.ingest.sentry.io/1'
    await expect(initMonitoring()).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('@sentry/node is not installed'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('pnpm --filter @growthos/api add'))
  })

  it('does nothing, and throws nothing, when unconfigured', () => {
    expect(() => captureException(new Error('boom'))).not.toThrow()
    expect(error).not.toHaveBeenCalled()
  })

  it('reports an error with its context once configured', () => {
    const client = fakeClient()
    __setMonitoringClientForTests(client)

    const err = new Error('boom')
    captureException(err, { url: '/api/v1/x', workspaceId: 'ws-1' })

    expect(client.captureException).toHaveBeenCalledWith(err, {
      extra: { url: '/api/v1/x', workspaceId: 'ws-1' },
    })
  })

  it('omits the hint entirely when there is no context', () => {
    const client = fakeClient()
    __setMonitoringClientForTests(client)
    captureException(new Error('boom'))
    expect(client.captureException).toHaveBeenCalledWith(expect.any(Error), undefined)
  })

  // The important one: a monitoring backend that throws must never turn a handled error into an
  // unhandled one. This is called from inside Fastify's error handler.
  it('swallows a failure inside the reporter itself', () => {
    const client = fakeClient()
    client.captureException.mockImplementation(() => {
      throw new Error('transport exploded')
    })
    __setMonitoringClientForTests(client)

    expect(() => captureException(new Error('original'))).not.toThrow()
    expect(error).toHaveBeenCalledWith({ err: expect.any(Error) }, expect.stringContaining('failed to report'))
  })

  it('flushes on the way out, and tolerates a flush that rejects', async () => {
    const client = fakeClient()
    __setMonitoringClientForTests(client)
    await expect(flushMonitoring(50)).resolves.toBeUndefined()
    expect(client.flush).toHaveBeenCalledWith(50)

    client.flush.mockRejectedValue(new Error('no network'))
    await expect(flushMonitoring(50)).resolves.toBeUndefined()
  })

  it('flushing is a no-op when unconfigured', async () => {
    await expect(flushMonitoring(50)).resolves.toBeUndefined()
  })
})
