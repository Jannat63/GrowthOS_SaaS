import type { FastifyRequest } from 'fastify'
import { desc, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { AuditLogEntry } from '@growthos/types'

export interface AuditInput {
  workspaceId: string
  actorId: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Append an audit entry. Best-effort: any failure is swallowed so auditing never breaks the
 * request it records. `request` (optional) supplies IP + user-agent.
 */
export async function recordAudit(input: AuditInput, request?: FastifyRequest): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
      ip: request?.ip ?? null,
      userAgent: request?.headers['user-agent'] ?? null,
    })
  } catch {
    // Auditing is non-critical — never surface a failure into the caller's path.
  }
}

/** Most-recent-first audit entries for a workspace, with each actor's display name. */
export async function getAuditLogs(
  workspaceId: string,
  limit: number,
  offset: number,
): Promise<{ data: AuditLogEntry[]; total: number }> {
  const rows = await db
    .select({
      id: schema.auditLogs.id,
      workspaceId: schema.auditLogs.workspaceId,
      actorId: schema.auditLogs.actorId,
      actorName: schema.user.name,
      action: schema.auditLogs.action,
      entityType: schema.auditLogs.entityType,
      entityId: schema.auditLogs.entityId,
      metadata: schema.auditLogs.metadata,
      createdAt: schema.auditLogs.createdAt,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.user, eq(schema.auditLogs.actorId, schema.user.id))
    .where(eq(schema.auditLogs.workspaceId, workspaceId))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit)
    .offset(offset)

  const total = await db.$count(schema.auditLogs, eq(schema.auditLogs.workspaceId, workspaceId))

  return {
    data: rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      actorId: r.actorId,
      actorName: r.actorName ?? null,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      metadata: (r.metadata as Record<string, unknown> | null) ?? null,
      createdAt: (r.createdAt ?? new Date()).toISOString(),
    })),
    total,
  }
}
