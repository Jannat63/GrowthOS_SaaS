import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { recordAudit, getAuditLogs } from './audit.js'

// Integration: requires Neon (dev stack up).
describe('audit log', () => {
  const ws = 'test-audit-ws'
  afterAll(async () => {
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.workspaceId, ws))
  })

  it('records entries and returns them most-recent-first with total', async () => {
    await recordAudit({
      workspaceId: ws,
      actorId: 'user-a',
      action: 'recommendation.status_changed',
      entityType: 'recommendation',
      entityId: 'rec-1',
      metadata: { status: 'acted' },
    })
    await recordAudit({
      workspaceId: ws,
      actorId: null,
      action: 'connection.connected',
      entityType: 'connection',
      entityId: 'conn-1',
    })

    const { data, total } = await getAuditLogs(ws, 20, 0)
    expect(total).toBe(2)
    expect(data).toHaveLength(2)
    // Most-recent-first: the connection event was written last.
    expect(data[0]!.action).toBe('connection.connected')
    expect(data[1]!.action).toBe('recommendation.status_changed')
    expect(data[1]!.metadata).toMatchObject({ status: 'acted' })
  })

  it('paginates via limit/offset', async () => {
    const page = await getAuditLogs(ws, 1, 0)
    expect(page.data).toHaveLength(1)
    expect(page.total).toBe(2)
  })
})
