import { describe, it, expect, vi, beforeEach } from 'vitest'

const listWorkspacesWithLastRun = vi.fn()
const recordSchedulerRun = vi.fn()
const getWeeklyReport = vi.fn()
const getMerTrend = vi.fn()
const getFatigueResults = vi.fn()
const emitIfChanged = vi.fn()
const publish = vi.fn()
const runAutomationForWorkspace = vi.fn()

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
// The single WebSocket transport (ws.ts) — the duplicate ../ws/events.js was deleted post-merge.
vi.mock('../ws.js', () => ({ publish }))
// Automation planning shares the tick but is a separate concern with its own DB access; stubbed
// here so these tests stay about the refresh loop. Its own behaviour is covered by the planner's
// unit tests and automation.test.ts.
vi.mock('../automation/actions.js', () => ({ runAutomationForWorkspace }))

const { runSchedulerTick, refreshWorkspace } = await import('./intelligence-scheduler.js')

beforeEach(() => {
  for (const m of [
    listWorkspacesWithLastRun,
    recordSchedulerRun,
    getWeeklyReport,
    getMerTrend,
    getFatigueResults,
    emitIfChanged,
    publish,
    runAutomationForWorkspace,
  ])
    m.mockReset()
  runAutomationForWorkspace.mockResolvedValue({ proposed: 0, autoExecuted: 0, failed: 0 })
  getWeeklyReport.mockResolvedValue({ weekStart: '2026-07-17' })
  getMerTrend.mockResolvedValue({ anomaly: { detected: false, changePercent: 0 }, summary: { blendedMER: 3 } })
  getFatigueResults.mockReturnValue([])
  emitIfChanged.mockResolvedValue(false)
})

describe('runSchedulerTick', () => {
  it('refreshes only due workspaces and pushes intelligence:report_ready for each', async () => {
    const now = new Date('2026-07-23T00:00:00Z')
    listWorkspacesWithLastRun.mockResolvedValue([
      { workspaceId: 'due', lastRunAt: null, config: null },
      { workspaceId: 'fresh', lastRunAt: new Date('2026-07-22T00:00:00Z'), config: null },
    ])

    const count = await runSchedulerTick(now)

    expect(count).toBe(1)
    expect(getWeeklyReport).toHaveBeenCalledWith('due')
    expect(getWeeklyReport).not.toHaveBeenCalledWith('fresh')
    expect(publish).toHaveBeenCalledWith({
      type: 'intelligence:report_ready',
      workspaceId: 'due',
      payload: { periodStart: '2026-07-17' },
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
    getMerTrend.mockResolvedValue({
      anomaly: { detected: true, changePercent: -22 },
      summary: { blendedMER: 2.4 },
    })
    emitIfChanged.mockImplementation(async (_ws: string, type: string) => type === 'mer_anomaly')

    await runSchedulerTick(new Date('2026-07-23T00:00:00Z'))

    expect(emitIfChanged).toHaveBeenCalledWith('w', 'mer_anomaly', 'mer:-22')
    expect(publish).toHaveBeenCalledWith({
      type: 'analytics:mer_alert',
      workspaceId: 'w',
      payload: { changePercent: -22, blendedMER: 2.4 },
    })
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
    expect(publish).toHaveBeenCalledWith({
      type: 'meta:fatigue_alert',
      workspaceId: 'w1',
      payload: { adSetId: 'Creative A' },
    })
  })
})
