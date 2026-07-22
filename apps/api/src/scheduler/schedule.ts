import type { AutomationConfig } from '@growthos/types'

/** A workspace paired with its last-refresh time and its automation config (null = defaults). */
export interface WorkspaceRun {
  workspaceId: string
  lastRunAt: Date | null
  config: AutomationConfig | null
}

/** True when a workspace has never been refreshed, or its last refresh is at least `cadenceMs` old. */
export function isDue(lastRunAt: Date | null, now: Date, cadenceMs: number): boolean {
  if (lastRunAt === null) return true
  return now.getTime() - lastRunAt.getTime() >= cadenceMs
}

/**
 * The workspace ids due for a refresh this tick. Skips workspaces with `enabled === false` and
 * uses each workspace's own `cadenceMs`, falling back to `defaultCadenceMs` when unset. Order preserved.
 */
export function selectDueWorkspaces(
  rows: WorkspaceRun[],
  now: Date,
  defaultCadenceMs: number,
): string[] {
  return rows
    .filter((r) => {
      if (r.config && r.config.enabled === false) return false
      const cadence = r.config?.cadenceMs ?? defaultCadenceMs
      return isDue(r.lastRunAt, now, cadence)
    })
    .map((r) => r.workspaceId)
}

/**
 * Whether an alert should re-fire: only when there is a current alertable condition (`next` is
 * non-empty) AND its fingerprint differs from what we last emitted. A standing, unchanged condition
 * stays silent; a new or changed one fires.
 */
export function shouldEmitAlert(prev: string | null, next: string): boolean {
  return next !== '' && next !== prev
}
