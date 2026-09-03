import { and, count, desc, eq, ilike, inArray, lte, or } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { Plan } from '@growthos/types'
import { getCurrentSubscription } from './billing.js'
import type { Page, Paged } from './pagination.js'

// ── Workspace directory ─────────────────────────────────────────────────────

export interface AdminWorkspaceSummary {
  id: string
  name: string
  slug: string
  plan: string
  subscriptionStatus: string
  memberCount: number
  connectedPlatformCount: number
  createdAt: string
}

export async function listWorkspaces(search: string | undefined, page: Page): Promise<Paged<AdminWorkspaceSummary>> {
  const whereClause = search ? ilike(schema.workspaces.name, `%${search}%`) : undefined

  const [totalRow] = await db.select({ value: count() }).from(schema.workspaces).where(whereClause)
  const total = totalRow?.value ?? 0

  const rows = await db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      slug: schema.workspaces.slug,
      createdAt: schema.workspaces.createdAt,
    })
    .from(schema.workspaces)
    .where(whereClause)
    .orderBy(desc(schema.workspaces.createdAt))
    .limit(page.limit)
    .offset(page.offset)

  const ids = rows.map((r) => r.id)

  const [memberCounts, connCounts, subRows] = await Promise.all([
    ids.length
      ? db
          .select({ workspaceId: schema.workspace_members.organizationId, value: count() })
          .from(schema.workspace_members)
          .where(inArray(schema.workspace_members.organizationId, ids))
          .groupBy(schema.workspace_members.organizationId)
      : Promise.resolve([]),
    ids.length
      ? db
          .select({ workspaceId: schema.platformConnections.workspaceId, value: count() })
          .from(schema.platformConnections)
          .where(and(inArray(schema.platformConnections.workspaceId, ids), eq(schema.platformConnections.isActive, true)))
          .groupBy(schema.platformConnections.workspaceId)
      : Promise.resolve([]),
    ids.length ? db.select().from(schema.subscriptions).where(inArray(schema.subscriptions.workspaceId, ids)) : Promise.resolve([]),
  ])

  const memberMap = new Map(memberCounts.map((r) => [r.workspaceId, r.value]))
  const connMap = new Map(connCounts.map((r) => [r.workspaceId, r.value]))
  const subMap = new Map(subRows.map((r) => [r.workspaceId, r]))

  const data: AdminWorkspaceSummary[] = rows.map((r) => {
    const sub = subMap.get(r.id)
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      // Same fallback as getCurrentSubscription: no subscriptions row = starter/trialing.
      plan: sub?.plan ?? 'starter',
      subscriptionStatus: sub?.status ?? 'trialing',
      memberCount: memberMap.get(r.id) ?? 0,
      connectedPlatformCount: connMap.get(r.id) ?? 0,
      createdAt: r.createdAt.toISOString(),
    }
  })

  return { data, total }
}

export interface AdminWorkspaceDetail {
  id: string
  name: string
  slug: string
  websiteUrl: string | null
  createdAt: string
  subscription: Awaited<ReturnType<typeof getCurrentSubscription>>
  members: { userId: string; name: string; email: string; role: string }[]
  connections: { platform: string; accountName: string | null; isActive: boolean | null; lastSyncedAt: string | null }[]
}

export async function getWorkspaceDetail(workspaceId: string): Promise<AdminWorkspaceDetail | null> {
  const [ws] = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId)).limit(1)
  if (!ws) return null

  const [subscription, members, connections] = await Promise.all([
    getCurrentSubscription(workspaceId),
    db
      .select({
        userId: schema.workspace_members.userId,
        role: schema.workspace_members.role,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.workspace_members)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspace_members.userId))
      .where(eq(schema.workspace_members.organizationId, workspaceId)),
    db
      .select({
        platform: schema.platformConnections.platform,
        accountName: schema.platformConnections.accountName,
        isActive: schema.platformConnections.isActive,
        lastSyncedAt: schema.platformConnections.lastSyncedAt,
      })
      .from(schema.platformConnections)
      .where(eq(schema.platformConnections.workspaceId, workspaceId)),
  ])

  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    websiteUrl: ws.websiteUrl,
    createdAt: ws.createdAt.toISOString(),
    subscription,
    members,
    connections: connections.map((c) => ({ ...c, lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null })),
  }
}

/**
 * Manually set a workspace's plan, bypassing Stripe entirely — for comps, manual fixes when Stripe
 * and the app disagree, or support overrides. The caller (the admin route) is responsible for
 * requiring 'super_admin' (not just 'support_agent') and for writing the audit-log entry with a
 * reason — this function only performs the write.
 */
export async function overrideWorkspacePlan(workspaceId: string, plan: Plan): Promise<void> {
  const [existing] = await db
    .select({ id: schema.subscriptions.id })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.workspaceId, workspaceId))
    .limit(1)

  if (existing) {
    await db
      .update(schema.subscriptions)
      .set({ plan, updatedAt: new Date() })
      .where(eq(schema.subscriptions.workspaceId, workspaceId))
  } else {
    await db.insert(schema.subscriptions).values({ workspaceId, plan, status: 'active' })
  }
}

// ── User directory ───────────────────────────────────────────────────────────

export interface AdminUserSummary {
  id: string
  name: string
  email: string
  platformRole: string | null
  workspaceCount: number
  createdAt: string
}

export async function listUsers(search: string | undefined, page: Page): Promise<Paged<AdminUserSummary>> {
  const whereClause = search
    ? or(ilike(schema.user.name, `%${search}%`), ilike(schema.user.email, `%${search}%`))
    : undefined

  const [totalRow] = await db.select({ value: count() }).from(schema.user).where(whereClause)
  const total = totalRow?.value ?? 0

  const rows = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      platformRole: schema.user.platformRole,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .where(whereClause)
    .orderBy(desc(schema.user.createdAt))
    .limit(page.limit)
    .offset(page.offset)

  const ids = rows.map((r) => r.id)
  const wsCounts = ids.length
    ? await db
        .select({ userId: schema.workspace_members.userId, value: count() })
        .from(schema.workspace_members)
        .where(inArray(schema.workspace_members.userId, ids))
        .groupBy(schema.workspace_members.userId)
    : []
  const wsMap = new Map(wsCounts.map((r) => [r.userId, r.value]))

  return {
    data: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      workspaceCount: wsMap.get(r.id) ?? 0,
    })),
    total,
  }
}

// ── Platform health ──────────────────────────────────────────────────────────

export interface PlatformHealth {
  totalWorkspaces: number
  totalUsers: number
  workspacesByPlan: { plan: string; count: number }[]
  trialsEndingSoonCount: number
}

/**
 * Platform-wide counts for the admin overview.
 *
 * **Every figure here counts from `workspaces`, never from `subscriptions` alone.** `workspaceId`
 * carries no foreign key — tenancy is enforced at the application layer (see tenancy.ts) — so
 * deleting a workspace leaves its subscription row behind. Scanning `subscriptions` therefore
 * counts customers who no longer exist: on the dev database that was 71 orphaned rows against 15
 * live workspaces, which the panel reported as 68 on growth, 4 on scale, and 27 trials about to
 * end. The true answer was 14 workspaces with no subscription row, 1 on growth, and 1 trial.
 *
 * The old `totalWorkspaces - subscribedCount` fallback was where this stayed invisible: with more
 * subscription rows than workspaces it goes negative, and a `> 0` guard then dropped it silently
 * instead of surfacing the contradiction.
 */
export async function getPlatformHealth(): Promise<PlatformHealth> {
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

  const [workspaceRows, userRows, byPlan, trialsRows] = await Promise.all([
    db.select({ value: count() }).from(schema.workspaces),
    db.select({ value: count() }).from(schema.user),
    // LEFT JOIN out of workspaces: one row per live workspace, and a workspace with no
    // subscription row surfaces as `plan: null` rather than being missing from the breakdown.
    db
      .select({ plan: schema.subscriptions.plan, value: count() })
      .from(schema.workspaces)
      .leftJoin(schema.subscriptions, eq(schema.subscriptions.workspaceId, schema.workspaces.id))
      .groupBy(schema.subscriptions.plan),
    db
      .select({ value: count() })
      .from(schema.subscriptions)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.subscriptions.workspaceId))
      .where(
        and(
          eq(schema.subscriptions.status, 'trialing'),
          lte(schema.subscriptions.trialEndsAt, in3Days),
        ),
      ),
  ])

  const totalWorkspaces = workspaceRows[0]?.value ?? 0
  const totalUsers = userRows[0]?.value ?? 0

  // No subscription row means starter/trialing (getCurrentSubscription's default), so it is
  // reported as 'starter' — the plan the workspace actually has, not a separate bucket. The
  // breakdown now sums to totalWorkspaces by construction.
  const merged = new Map<string, number>()
  for (const row of byPlan) {
    const plan = row.plan ?? 'starter'
    merged.set(plan, (merged.get(plan) ?? 0) + row.value)
  }
  const workspacesByPlan = [...merged].map(([plan, count]) => ({ plan, count }))

  const trialsEndingSoonCount = trialsRows[0]?.value ?? 0

  return { totalWorkspaces, totalUsers, workspacesByPlan, trialsEndingSoonCount }
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export interface AdminAuditLogEntry {
  id: string
  actorUserId: string
  actorName: string | null
  actorEmail: string | null
  action: string
  targetType: string
  targetId: string
  metadata: unknown
  createdAt: string
}

export async function listAuditLog(page: Page): Promise<Paged<AdminAuditLogEntry>> {
  const [totalRow] = await db.select({ value: count() }).from(schema.adminAuditLog)
  const total = totalRow?.value ?? 0

  const rows = await db
    .select({
      id: schema.adminAuditLog.id,
      actorUserId: schema.adminAuditLog.actorUserId,
      actorName: schema.user.name,
      actorEmail: schema.user.email,
      action: schema.adminAuditLog.action,
      targetType: schema.adminAuditLog.targetType,
      targetId: schema.adminAuditLog.targetId,
      metadata: schema.adminAuditLog.metadata,
      createdAt: schema.adminAuditLog.createdAt,
    })
    .from(schema.adminAuditLog)
    .leftJoin(schema.user, eq(schema.user.id, schema.adminAuditLog.actorUserId))
    .orderBy(desc(schema.adminAuditLog.createdAt))
    .limit(page.limit)
    .offset(page.offset)

  return {
    data: rows.map((r) => ({ ...r, createdAt: r.createdAt!.toISOString() })),
    total,
  }
}
