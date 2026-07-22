import { describe, it, expect, vi, beforeEach } from 'vitest'

const publish = vi.fn()
vi.mock('../jobs/client.js', () => ({
  getRedis: () => ({ publish }),
}))

// Import after the mock is registered.
const { publishEvent, WS_CHANNEL } = await import('./events.js')

describe('publishEvent', () => {
  beforeEach(() => publish.mockReset())

  it('publishes the {workspaceId, event} envelope on the ws channel', async () => {
    await publishEvent('ws-1', { type: 'job:complete', jobId: 'j-1', workspaceId: 'ws-1' })

    expect(publish).toHaveBeenCalledTimes(1)
    const [channel, raw] = publish.mock.calls[0]!
    expect(channel).toBe(WS_CHANNEL)
    expect(JSON.parse(raw)).toEqual({
      workspaceId: 'ws-1',
      event: { type: 'job:complete', jobId: 'j-1', workspaceId: 'ws-1' },
    })
  })

  it('never throws when the bus is down (best-effort)', async () => {
    publish.mockRejectedValueOnce(new Error('redis down'))
    await expect(
      publishEvent('ws-1', { type: 'analytics:mer_alert', workspaceId: 'ws-1' }),
    ).resolves.toBeUndefined()
  })
})
