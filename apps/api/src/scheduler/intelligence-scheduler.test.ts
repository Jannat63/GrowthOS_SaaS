import { describe, it, expect, vi, beforeEach } from 'vitest'

const listWorkspacesWithLastRun = vi.fn()
const recordSchedulerRun = vi.fn()
const getWeeklyReport = vi.fn()
const getMerTrend = vi.fn()
const getFatigueResults = vi.fn()
const emitIfChanged = vi.fn()
const publishEvent = vi.fn()

vi.mock('./lock.js', () => ({
  withRedisLock: async (_k: string, _t: number, fn: () => Promise<void>) => {
    await fn()
    return true
  },
}))
vi.mock('./queries.js', () => ({ listWorkspacesWithLastRun, recordSchedulerRun }))
vi.mock('./alerts.js', () => ({ emitIfChanged }))
vi.mock('../intelligence.js', () => ({ getWeeklyReport }))
vi.mock('../analytics.js', () => ({ getMerTrend }))
vi.mock('../fatigue.js', () => ({ getFatigueResults }))
vi.mock('../ws/events.js', () => ({ publishEvent }))

const { runSchedulerTick, refreshWorkspace } = await import('./intelligence-scheduler.js')

beforeEach(() => {
  for (const m of [
    listWorkspacesWithLastRun,
    recordSchedulerRun,
    getWeeklyReport,
    getMerTrend,
    getFatigueResults,
    emitIfChanged,
    publishEvent,
  ])
    m.mockReset()
  getWeeklyReport.mockResolvedValue({ weekStart: '2026-07-17' })
  getMerTrend.mockResolvedValue({ anomaly: { detected: false, changePercent: 0 } })
  getFatigueResults.mockReturnValue([])
  emitIfChanged.mockResolvedValue(false)
})

describe('runSchedulerTick', () => {
  it('refreshes only due workspaces and pushes report:ready for each', async () => {
    const now = new Date('2026-07-23T00:00:00Z')
    listWorkspacesWithLastRun.mockResolvedValue([
      { workspaceId: 'due', lastRunAt: null, config: null },
      { workspaceId: 'fresh', lastRunAt: new Date('2026-07-22T00:00:00Z'), config: null },
    ])

    const count = await runSchedulerTick(now)

    expect(count).toBe(1)
    expect(getWeeklyReport).toHaveBeenCalledWith('due')
    expect(getWeeklyReport).not.toHaveBeenCalledWith('fresh')
    expect(publishEvent).toHaveBeenCalledWith('due', {
      type: 'report:ready',
      workspaceId: 'due',
      periodStart: '2026-07-17',
    })
    expect(recordSchedulerRun).toHaveBeenCalledWith(
      expect.objectContaining({ refreshedCount: 1, errorCount: 0 }),
    )
  })

  it('one workspace failing does not stop the others and is recorded', async () => {
    listWorkspacesWithLastRun.mockResolvedValue([
      { workspaceId: 'bad', lastRunAt: null, config: null },
      { workspaceId: 'good', lastRunAt: null, config: null },
    ])
    getWeeklyReport.mockImplementation(async (ws: string) => {
      if (ws === 'bad') throw new Error('clickhouse down')
      return { weekStart: '2026-07-17' }
    })

    const count = await runSchedulerTick(new Date('2026-07-23T00:00:00Z'))

    expect(count).toBe(1)
    expect(recordSchedulerRun).toHaveBeenCalledWith(
      expect.objectContaining({ refreshedCount: 1, errorCount: 1 }),
    )
  })

  it('emits a fresh mer_alert when the anomaly signature is new', async () => {
    listWorkspacesWithLastRun.mockResolvedValue([{ workspaceId: 'w', lastRunAt: null, config: null }])
    getMerTrend.mockResolvedValue({ anomaly: { detected: true, changePercent: -22 } })
    emitIfChanged.mockImplementation(async (_ws: string, type: string) => type === 'mer_anomaly')

    await runSchedulerTick(new Date('2026-07-23T00:00:00Z'))

    expect(emitIfChanged).toHaveBeenCalledWith('w', 'mer_anomaly', 'mer:-22')
    expect(publishEvent).toHaveBeenCalledWith('w', { type: 'analytics:mer_alert', workspaceId: 'w' })
  })
})

describe('refreshWorkspace', () => {
  it('emits meta:fatigue_alert with the worst creative when fatigue is newly detected', async () => {
    getFatigueResults.mockReturnValue([
      { name: 'Creative A', status: 'fatigued' },
      { name: 'Creative B', status: 'healthy' },
    ])
    emitIfChanged.mockImplementation(async (_ws: string, type: string) => type === 'fatigue')

    const alerts = await refreshWorkspace('w1')

    expect(alerts).toBe(1)
    expect(emitIfChanged).toHaveBeenCalledWith('w1', 'fatigue', 'Creative A:fatigued')
    expect(publishEvent).toHaveBeenCalledWith('w1', {
      type: 'meta:fatigue_alert',
      workspaceId: 'w1',
      adSetId: 'Creative A',
    })
  })
})
