import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { shouldEmitAlert } from './schedule.js'

/**
 * Persistent alert de-duplication. `emitIfChanged` returns true (and records the new signature)
 * only when there is a current alertable condition whose fingerprint differs from the last one we
 * emitted for this (workspace, alertType). Replaces the old per-process in-memory dedupe, so an
 * alert re-fires across restarts only when the underlying condition actually changes.
 */
export async function emitIfChanged(
  workspaceId: string,
  alertType: string,
  nextSignature: string,
): Promise<boolean> {
  const [row] = await db
    .select({ signature: schema.automationAlerts.signature })
    .from(schema.automationAlerts)
    .where(
      and(
        eq(schema.automationAlerts.workspaceId, workspaceId),
        eq(schema.automationAlerts.alertType, alertType),
      ),
    )
    .limit(1)

  if (!shouldEmitAlert(row?.signature ?? null, nextSignature)) return false

  await db
    .insert(schema.automationAlerts)
    .values({ workspaceId, alertType, signature: nextSignature })
    .onConflictDoUpdate({
      target: [schema.automationAlerts.workspaceId, schema.automationAlerts.alertType],
      set: { signature: nextSignature, emittedAt: new Date() },
    })
  return true
}
