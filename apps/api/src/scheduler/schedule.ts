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
 * The workspace ids due for a refresh this tick. Skips workspaces with `enabled === false` and uses
 * each workspace's own `cadenceMs`, falling back to `defaultCadenceMs` when unset.
 *
 * Returned **stalest-first**, and optionally bounded by `maxPerTick`.
 *
 * The bound is a correctness measure, not a performance tweak. A tick runs inside a Redis lock with
 * a finite TTL, and its work grows linearly with the number of due workspaces — each one costing a
 * report refresh plus an automation planning pass. Left unbounded, a large enough account list makes
 * a tick outlast its own lock, at which point the next instance starts while the first is still
 * running and two schedulers mutate the same workspaces concurrently. Bounding the batch keeps a
 * tick's worst-case duration proportional to a constant, not to customer count.
 *
 * Stalest-first is what makes the bound safe: the workspaces waiting longest are always served
 * first, so nothing starves behind a busy neighbour when the ceiling bites. Never-run workspaces
 * (`lastRunAt === null`) sort ahead of everything.
 */
export function selectDueWorkspaces(
  rows: WorkspaceRun[],
  now: Date,
  defaultCadenceMs: number,
  maxPerTick?: number,
): string[] {
  const due = rows
    .filter((r) => {
      if (r.config && r.config.enabled === false) return false
      const cadence = r.config?.cadenceMs ?? defaultCadenceMs
      return isDue(r.lastRunAt, now, cadence)
    })
    .sort((a, b) => (a.lastRunAt?.getTime() ?? 0) - (b.lastRunAt?.getTime() ?? 0))

  const bounded = maxPerTick !== undefined ? due.slice(0, maxPerTick) : due
  return bounded.map((r) => r.workspaceId)
}

/**
 * Whether an alert should re-fire: only when there is a current alertable condition (`next` is
 * non-empty) AND its fingerprint differs from what we last emitted. A standing, unchanged condition
 * stays silent; a new or changed one fires.
 */
export function shouldEmitAlert(prev: string | null, next: string): boolean {
  return next !== '' && next !== prev
}
