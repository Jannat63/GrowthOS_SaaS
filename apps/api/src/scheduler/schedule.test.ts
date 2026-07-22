import { describe, it, expect } from 'vitest'
import { isDue, selectDueWorkspaces, shouldEmitAlert, type WorkspaceRun } from './schedule.js'

const CADENCE = 7 * 24 * 60 * 60 * 1000 // 7 days
const now = new Date('2026-07-23T00:00:00Z')

describe('isDue', () => {
  it('is due when never run', () => {
    expect(isDue(null, now, CADENCE)).toBe(true)
  })
  it('is due when the last run is older than the cadence', () => {
    expect(isDue(new Date('2026-07-15T00:00:00Z'), now, CADENCE)).toBe(true) // 8 days
  })
  it('is not due when the last run is within the cadence', () => {
    expect(isDue(new Date('2026-07-20T00:00:00Z'), now, CADENCE)).toBe(false) // 3 days
  })
  it('is due exactly at the cadence boundary', () => {
    expect(isDue(new Date('2026-07-16T00:00:00Z'), now, CADENCE)).toBe(true) // exactly 7 days
  })
})

describe('selectDueWorkspaces', () => {
  it('returns only due ids and skips disabled workspaces', () => {
    const rows: WorkspaceRun[] = [
      { workspaceId: 'never', lastRunAt: null, config: null }, // due
      { workspaceId: 'fresh', lastRunAt: new Date('2026-07-22T00:00:00Z'), config: null }, // 1d, not due
      { workspaceId: 'stale', lastRunAt: new Date('2026-07-01T00:00:00Z'), config: null }, // due
      { workspaceId: 'off', lastRunAt: null, config: { enabled: false, cadenceMs: CADENCE } }, // disabled
    ]
    expect(selectDueWorkspaces(rows, now, CADENCE)).toEqual(['never', 'stale'])
  })

  it('honors a per-workspace cadence over the default', () => {
    const rows: WorkspaceRun[] = [
      // 2 days old: not due under the 7-day default, but due under a 1-day custom cadence.
      { workspaceId: 'daily', lastRunAt: new Date('2026-07-21T00:00:00Z'), config: { enabled: true, cadenceMs: 24 * 60 * 60 * 1000 } },
    ]
    expect(selectDueWorkspaces(rows, now, CADENCE)).toEqual(['daily'])
  })
})

describe('shouldEmitAlert', () => {
  it('emits when a new condition appears', () => {
    expect(shouldEmitAlert(null, 'mer:-22')).toBe(true)
  })
  it('stays silent for an unchanged standing condition', () => {
    expect(shouldEmitAlert('mer:-22', 'mer:-22')).toBe(false)
  })
  it('re-emits when the condition changes', () => {
    expect(shouldEmitAlert('mer:-22', 'mer:31')).toBe(true)
  })
  it('does not emit when there is no current condition', () => {
    expect(shouldEmitAlert('mer:-22', '')).toBe(false)
    expect(shouldEmitAlert(null, '')).toBe(false)
  })
})
