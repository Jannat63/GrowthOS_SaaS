import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, lt, lte, max, notInArray, or, sql } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import {
  PLAN_PRICE_USD_CENTS,
  type AdminActivityItem,
  type AdminUserFilter,
  type AdminUserDetail,
  type AdminUserSort,
  type AdminUserSummary,
  type AdminWorkspaceDetail,
  type AdminWorkspaceFilter,
  type AdminWorkspaceSort,
  type AdminWorkspaceSummary,
  type Plan,
  type PlatformOverview,
  type PlatformRole,
} from '@growthos/types'
import { READ_ACTION_NAMES } from './admin-audit.js'
import { getCurrentSubscription } from './billing.js'
import type { Page, Paged } from './pagination.js'

// ── Workspace directory ─────────────────────────────────────────────────────

/**
 * The directory row shapes are re-exported from @growthos/types rather than declared here.
 * They were declared in both places, which is two copies of one wire contract: adding a column
 * meant editing the same interface twice, and forgetting the second copy is a type error in a file
 * nobody was looking at.
 */
export type { AdminUserSummary, AdminWorkspaceSummary }

export interface WorkspaceListOptions {
  filter?: AdminWorkspaceFilter | undefined
  sort?: AdminWorkspaceSort | undefined
}

/**
 * The workspace directory.
 *
 * Filtering happens in SQL, not on the page. The list is paginated, so a filter applied client-side
 * would only narrow the fifty rows that happen to be loaded — an operator looking for every
 * past-due account would be shown the past-due accounts on page one and told that was all of them.
 *
 * `subscriptions` is joined rather than fetched separately when a filter or sort needs it, because
 * "which workspaces are past due" cannot be answered after the page has already been cut.
 */
export async function listWorkspaces(
  search: string | undefined,
  page: Page,
  options: WorkspaceListOptions = {},
): Promise<Paged<AdminWorkspaceSummary>> {
  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * DAY_MS)

  const conditions = []
  if (search) conditions.push(ilike(schema.workspaces.name, `%${search}%`))

  switch (options.filter) {
    case 'past_due':
      conditions.push(eq(schema.subscriptions.status, 'past_due'))
      break
    case 'trial_ending':
      conditions.push(
        and(eq(schema.subscriptions.status, 'trialing'), lte(schema.subscriptions.trialEndsAt, in3Days))!,
      )
      break
    case 'cancelling':
      conditions.push(and(isNotNull(schema.subscriptions.cancelAt), gte(schema.subscriptions.cancelAt, now))!)
      break
    case 'no_connections':
      // A correlated NOT EXISTS rather than a join: a workspace with two connections would
      // otherwise appear twice, and one with none would be dropped by an inner join entirely.
      conditions.push(
        sql`not exists (select 1 from ${schema.platformConnections} pc where pc.workspace_id = ${schema.workspaces.id} and pc.is_active = true)`,
      )
      break
    default:
      break
  }

  const whereClause = conditions.length ? and(...conditions) : undefined

  // Every filter except no_connections reads a subscriptions column, so the join has to be present
  // for the WHERE to compile. LEFT, so filtering off is not silently also filtering out the
  // workspaces that have no subscription row.
  const base = db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      slug: schema.workspaces.slug,
      createdAt: schema.workspaces.createdAt,
    })
    .from(schema.workspaces)
    .leftJoin(schema.subscriptions, eq(schema.subscriptions.workspaceId, schema.workspaces.id))
    .$dynamic()

  const orderBy =
    options.sort === 'name'
      ? asc(schema.workspaces.name)
      : desc(schema.workspaces.createdAt)

  const [totalRow] = await db
    .select({ value: count() })
    .from(schema.workspaces)
    .leftJoin(schema.subscriptions, eq(schema.subscriptions.workspaceId, schema.workspaces.id))
    .where(whereClause)
  const total = totalRow?.value ?? 0

  const rows = await base.where(whereClause).orderBy(orderBy).limit(page.limit).offset(page.offset)

  const ids = rows.map((r) => r.id)

  const [memberCounts, connCounts, subRows, activityRows] = await Promise.all([
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
    // Last activity, from the workspace's own audit log. Grouped over the page's ids rather than
    // joined, for the same reason the counts are: a join would multiply the rows.
    ids.length
      ? db
          .select({ workspaceId: schema.auditLogs.workspaceId, value: max(schema.auditLogs.createdAt) })
          .from(schema.auditLogs)
          .where(inArray(schema.auditLogs.workspaceId, ids))
          .groupBy(schema.auditLogs.workspaceId)
      : Promise.resolve([]),
  ])

  const memberMap = new Map(memberCounts.map((r) => [r.workspaceId, r.value]))
  const connMap = new Map(connCounts.map((r) => [r.workspaceId, r.value]))
  const subMap = new Map(subRows.map((r) => [r.workspaceId, r]))
  const activityMap = new Map(activityRows.map((r) => [r.workspaceId, r.value]))

  const data: AdminWorkspaceSummary[] = rows.map((r) => {
    const sub = subMap.get(r.id)
    const lastActivity = activityMap.get(r.id)
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
      trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
      lastActivityAt: lastActivity ? new Date(lastActivity).toISOString() : null,
    }
  })

  // Sorts over a value that is assembled per page (members, last activity) are applied here rather
  // than in SQL. They order the page, not the table — which is the honest behaviour to expose, and
  // the alternative is a grouped subquery on every column for a directory of this size.
  if (options.sort === 'members') data.sort((x, y) => y.memberCount - x.memberCount)
  if (options.sort === 'activity') {
    data.sort((x, y) => (y.lastActivityAt ?? '').localeCompare(x.lastActivityAt ?? ''))
  }

  return { data, total }
}

export type { AdminWorkspaceDetail }

export async function getWorkspaceDetail(workspaceId: string): Promise<AdminWorkspaceDetail | null> {
  const [ws] = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId)).limit(1)
  if (!ws) return null

  const [subscription, stripeIds, members, connections] = await Promise.all([
    getCurrentSubscription(workspaceId),
    // Stripe's own ids, so the console links out to the invoice rather than restating billing.
    db
      .select({
        customerId: schema.subscriptions.stripeCustomerId,
        subscriptionId: schema.subscriptions.stripeSubscriptionId,
      })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.workspaceId, workspaceId))
      .limit(1),
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
        syncError: schema.platformConnections.syncError,
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
    stripeCustomerId: stripeIds[0]?.customerId ?? null,
    stripeSubscriptionId: stripeIds[0]?.subscriptionId ?? null,
    members,
    connections: connections.map((c) => ({ ...c, lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null })),
  }
}

/**
 * A workspace's own history: what the customer did, and what ran for them, in one timeline.
 *
 * Both sources are capped and then merged, so the result is the most recent `limit` entries across
 * both rather than the most recent of each — an account whose jobs all failed last night should not
 * push a week of customer activity off the page, and vice versa.
 */
export async function getWorkspaceActivity(workspaceId: string, limit = 40): Promise<AdminActivityItem[]> {
  const [audit, jobs] = await Promise.all([
    db
      .select({
        at: schema.auditLogs.createdAt,
        action: schema.auditLogs.action,
        entityType: schema.auditLogs.entityType,
        actorName: schema.user.name,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.user, eq(schema.user.id, schema.auditLogs.actorId))
      .where(eq(schema.auditLogs.workspaceId, workspaceId))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit),
    db
      .select({
        at: schema.backgroundJobs.queuedAt,
        completedAt: schema.backgroundJobs.completedAt,
        type: schema.backgroundJobs.type,
        status: schema.backgroundJobs.status,
        error: schema.backgroundJobs.error,
      })
      .from(schema.backgroundJobs)
      .where(eq(schema.backgroundJobs.workspaceId, workspaceId))
      .orderBy(desc(schema.backgroundJobs.queuedAt))
      .limit(limit),
  ])

  const items: AdminActivityItem[] = [
    ...audit.map((a) => ({
      kind: 'audit' as const,
      at: a.at?.toISOString() ?? new Date(0).toISOString(),
      action: a.action,
      entityType: a.entityType,
      actorName: a.actorName,
    })),
    ...jobs.map((j) => ({
      kind: 'job' as const,
      at: (j.completedAt ?? j.at)?.toISOString() ?? new Date(0).toISOString(),
      type: j.type,
      status: j.status,
      error: j.error,
    })),
  ]

  return items.sort((x, y) => y.at.localeCompare(x.at)).slice(0, limit)
}

/** Everything platform staff have done to, or looked at on, this one account. */
export async function getWorkspaceAdminHistory(workspaceId: string, limit = 40) {
  return db
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
    .where(
      and(eq(schema.adminAuditLog.targetType, 'workspace'), eq(schema.adminAuditLog.targetId, workspaceId)),
    )
    .orderBy(desc(schema.adminAuditLog.createdAt))
    .limit(limit)
    .then((rows) => rows.map((r) => ({ ...r, createdAt: r.createdAt!.toISOString() })))
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

export interface UserListOptions {
  filter?: AdminUserFilter | undefined
  sort?: AdminUserSort | undefined
}

export async function listUsers(
  search: string | undefined,
  page: Page,
  options: UserListOptions = {},
): Promise<Paged<AdminUserSummary>> {
  const conditions = []
  if (search) {
    conditions.push(or(ilike(schema.user.name, `%${search}%`), ilike(schema.user.email, `%${search}%`))!)
  }
  if (options.filter === 'staff') conditions.push(isNotNull(schema.user.platformRole))
  if (options.filter === 'no_workspace') {
    // The people worth finding here are the ones who signed up and stopped: an account with no
    // membership never finished onboarding, or was invited and never accepted.
    conditions.push(
      sql`not exists (select 1 from ${schema.workspace_members} wm where wm.user_id = ${schema.user.id})`,
    )
  }
  const whereClause = conditions.length ? and(...conditions) : undefined

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
    .orderBy(options.sort === 'name' ? asc(schema.user.name) : desc(schema.user.createdAt))
    .limit(page.limit)
    .offset(page.offset)

  const ids = rows.map((r) => r.id)
  const [wsCounts, seenRows] = await Promise.all([
    ids.length
      ? db
          .select({ userId: schema.workspace_members.userId, value: count() })
          .from(schema.workspace_members)
          .where(inArray(schema.workspace_members.userId, ids))
          .groupBy(schema.workspace_members.userId)
      : Promise.resolve([]),
    // Sessions are deleted when they expire, so this is "recently seen" rather than a full history
    // — which is the reading an operator wants from a column called Last seen.
    ids.length
      ? db
          .select({ userId: schema.session.userId, value: max(schema.session.updatedAt) })
          .from(schema.session)
          .where(inArray(schema.session.userId, ids))
          .groupBy(schema.session.userId)
      : Promise.resolve([]),
  ])
  const wsMap = new Map(wsCounts.map((r) => [r.userId, r.value]))
  const seenMap = new Map(seenRows.map((r) => [r.userId, r.value]))

  const data: AdminUserSummary[] = rows.map((r) => {
    const seen = seenMap.get(r.id)
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      workspaceCount: wsMap.get(r.id) ?? 0,
      lastSeenAt: seen ? new Date(seen).toISOString() : null,
    }
  })

  // Assembled per page, so it orders the page rather than the table — see listWorkspaces.
  if (options.sort === 'last_seen') {
    data.sort((x, y) => (y.lastSeenAt ?? '').localeCompare(x.lastSeenAt ?? ''))
  }

  return { data, total }
}

/** One person's file: who they are, where they belong, and where they are signed in. */
export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const [row] = await db.select().from(schema.user).where(eq(schema.user.id, userId)).limit(1)
  if (!row) return null

  const [memberships, sessions] = await Promise.all([
    db
      .select({
        workspaceId: schema.workspace_members.organizationId,
        role: schema.workspace_members.role,
        workspaceName: schema.workspaces.name,
        workspaceSlug: schema.workspaces.slug,
      })
      .from(schema.workspace_members)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.workspace_members.organizationId))
      .where(eq(schema.workspace_members.userId, userId)),
    // Live sessions only. An expired row is deleted by Better Auth rather than kept, so filtering
    // on expiry here is belt and braces against one that has not been swept yet.
    db
      .select({
        id: schema.session.id,
        createdAt: schema.session.createdAt,
        lastUsedAt: schema.session.updatedAt,
        expiresAt: schema.session.expiresAt,
        ipAddress: schema.session.ipAddress,
        userAgent: schema.session.userAgent,
      })
      .from(schema.session)
      .where(and(eq(schema.session.userId, userId), gte(schema.session.expiresAt, new Date())))
      .orderBy(desc(schema.session.updatedAt)),
  ])

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image ?? null,
    platformRole: (row.platformRole as AdminUserDetail['platformRole']) ?? null,
    phone: row.phone ?? null,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: sessions[0]?.lastUsedAt?.toISOString() ?? null,
    memberships: memberships.map((m) => ({
      workspaceId: m.workspaceId,
      workspaceName: m.workspaceName,
      workspaceSlug: m.workspaceSlug,
      role: m.role as AdminUserDetail['memberships'][number]['role'],
    })),
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      lastUsedAt: s.lastUsedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
    })),
  }
}

/**
 * Grant or remove a platform role. `null` removes it.
 *
 * The route is responsible for requiring super_admin, for refusing to change the caller's own row,
 * and for the audit entry — this only performs the write. It does not weaken `input: false` on the
 * Better Auth field: the role is still unsettable through any customer-facing form, and is now
 * settable by an audited super-admin route as well as by packages/db/scripts/grant-admin.ts.
 */
export async function setPlatformRole(userId: string, role: PlatformRole | null): Promise<void> {
  await db.update(schema.user).set({ platformRole: role }).where(eq(schema.user.id, userId))
}

/** Signs a person out of every device. Returns how many sessions were ended. */
export async function revokeUserSessions(userId: string): Promise<number> {
  const deleted = await db
    .delete(schema.session)
    .where(eq(schema.session.userId, userId))
    .returning({ id: schema.session.id })
  return deleted.length
}

/**
 * Push a trial out by `days` from wherever it currently ends — or from now, if it has already
 * lapsed. Extending from `now` in both cases would silently shorten a trial that still had a week
 * left, which is the opposite of what "extend" means.
 */
export async function extendTrial(workspaceId: string, days: number): Promise<Date | null> {
  const [existing] = await db
    .select({ id: schema.subscriptions.id, trialEndsAt: schema.subscriptions.trialEndsAt })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.workspaceId, workspaceId))
    .limit(1)

  const now = new Date()
  const from = existing?.trialEndsAt && existing.trialEndsAt > now ? existing.trialEndsAt : now
  const trialEndsAt = new Date(from.getTime() + days * DAY_MS)

  if (existing) {
    await db
      .update(schema.subscriptions)
      .set({ trialEndsAt, status: 'trialing', updatedAt: now })
      .where(eq(schema.subscriptions.workspaceId, workspaceId))
  } else {
    // No row yet means the workspace is on the implicit starter trial (see getCurrentSubscription).
    // Extending it has to write the row that was never created.
    await db
      .insert(schema.subscriptions)
      .values({ workspaceId, plan: 'starter', status: 'trialing', trialEndsAt })
  }
  return trialEndsAt
}

// ── Platform overview ────────────────────────────────────────────────────────

/**
 * How many rows each attention queue returns. An operator works a queue; a queue of two hundred is
 * a report. The accompanying `*Total` says how many there really are, so the page can say "and 40
 * more" without pretending the list is the whole truth.
 */
const ATTENTION_LIMIT = 6

const DAY_MS = 24 * 60 * 60 * 1000

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
export async function getPlatformOverview(): Promise<PlatformOverview> {
  const now = Date.now()
  const in3Days = new Date(now + 3 * DAY_MS)
  const sevenDaysAgo = new Date(now - 7 * DAY_MS)

  const pastDueWhere = eq(schema.subscriptions.status, 'past_due')
  const trialWhere = and(
    eq(schema.subscriptions.status, 'trialing'),
    lte(schema.subscriptions.trialEndsAt, in3Days),
  )
  // A connection that has never synced (`lastSyncedAt IS NULL`) is deliberately not stale: it is
  // usually one that was connected minutes ago, and flagging those would fill the queue with
  // healthy new accounts. Inactive is always worth surfacing.
  const staleWhere = or(
    eq(schema.platformConnections.isActive, false),
    lt(schema.platformConnections.lastSyncedAt, sevenDaysAgo),
  )
  const failedWhere = and(
    eq(schema.backgroundJobs.status, 'failed'),
    gte(schema.backgroundJobs.queuedAt, sevenDaysAgo),
  )

  const [
    workspaceRows,
    userRows,
    signupRows,
    byPlan,
    activeByPlan,
    pastDue,
    pastDueCount,
    trials,
    trialCount,
    stale,
    staleCount,
    jobs,
    jobCount,
  ] = await Promise.all([
    db.select({ value: count() }).from(schema.workspaces),
    db.select({ value: count() }).from(schema.user),
    db.select({ value: count() }).from(schema.user).where(gte(schema.user.createdAt, sevenDaysAgo)),
    // LEFT JOIN out of workspaces: one row per live workspace, and a workspace with no
    // subscription row surfaces as `plan: null` rather than being missing from the breakdown.
    db
      .select({ plan: schema.subscriptions.plan, value: count() })
      .from(schema.workspaces)
      .leftJoin(schema.subscriptions, eq(schema.subscriptions.workspaceId, schema.workspaces.id))
      .groupBy(schema.subscriptions.plan),
    // Revenue counts `active` only — see PlatformOverview.mrrCents for why trials and past_due are
    // excluded.
    db
      .select({ plan: schema.subscriptions.plan, value: count() })
      .from(schema.subscriptions)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.subscriptions.workspaceId))
      .where(eq(schema.subscriptions.status, 'active'))
      .groupBy(schema.subscriptions.plan),
    db
      .select({
        workspaceId: schema.workspaces.id,
        workspaceName: schema.workspaces.name,
        plan: schema.subscriptions.plan,
        since: schema.subscriptions.updatedAt,
      })
      .from(schema.subscriptions)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.subscriptions.workspaceId))
      .where(pastDueWhere)
      .orderBy(asc(schema.subscriptions.updatedAt))
      .limit(ATTENTION_LIMIT),
    db
      .select({ value: count() })
      .from(schema.subscriptions)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.subscriptions.workspaceId))
      .where(pastDueWhere),
    db
      .select({
        workspaceId: schema.workspaces.id,
        workspaceName: schema.workspaces.name,
        plan: schema.subscriptions.plan,
        trialEndsAt: schema.subscriptions.trialEndsAt,
      })
      .from(schema.subscriptions)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.subscriptions.workspaceId))
      .where(trialWhere)
      .orderBy(asc(schema.subscriptions.trialEndsAt))
      .limit(ATTENTION_LIMIT),
    db
      .select({ value: count() })
      .from(schema.subscriptions)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.subscriptions.workspaceId))
      .where(trialWhere),
    db
      .select({
        workspaceId: schema.workspaces.id,
        workspaceName: schema.workspaces.name,
        platform: schema.platformConnections.platform,
        accountName: schema.platformConnections.accountName,
        lastSyncedAt: schema.platformConnections.lastSyncedAt,
        isActive: schema.platformConnections.isActive,
      })
      .from(schema.platformConnections)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.platformConnections.workspaceId))
      .where(staleWhere)
      .orderBy(asc(schema.platformConnections.lastSyncedAt))
      .limit(ATTENTION_LIMIT),
    db
      .select({ value: count() })
      .from(schema.platformConnections)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.platformConnections.workspaceId))
      .where(staleWhere),
    db
      .select({
        workspaceId: schema.workspaces.id,
        workspaceName: schema.workspaces.name,
        jobId: schema.backgroundJobs.id,
        type: schema.backgroundJobs.type,
        error: schema.backgroundJobs.error,
        completedAt: schema.backgroundJobs.completedAt,
        queuedAt: schema.backgroundJobs.queuedAt,
      })
      .from(schema.backgroundJobs)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.backgroundJobs.workspaceId))
      .where(failedWhere)
      .orderBy(desc(schema.backgroundJobs.queuedAt))
      .limit(ATTENTION_LIMIT),
    db
      .select({ value: count() })
      .from(schema.backgroundJobs)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.backgroundJobs.workspaceId))
      .where(failedWhere),
  ])

  // No subscription row means starter/trialing (getCurrentSubscription's default), so it is
  // reported as 'starter' — the plan the workspace actually has, not a separate bucket. The
  // breakdown therefore sums to totalWorkspaces by construction.
  const merged = new Map<string, number>()
  for (const row of byPlan) {
    const plan = row.plan ?? 'starter'
    merged.set(plan, (merged.get(plan) ?? 0) + row.value)
  }

  let mrrCents = 0
  for (const row of activeByPlan) {
    const price = PLAN_PRICE_USD_CENTS[row.plan as Plan]
    // A plan name we do not price (a renamed tier, a bad row) contributes nothing rather than NaN,
    // which would render the whole figure as "$NaN" and take every other plan's revenue with it.
    if (typeof price === 'number') mrrCents += price * row.value
  }

  return {
    totalWorkspaces: workspaceRows[0]?.value ?? 0,
    totalUsers: userRows[0]?.value ?? 0,
    signupsLast7d: signupRows[0]?.value ?? 0,
    mrrCents,
    workspacesByPlan: [...merged].map(([plan, count]) => ({ plan, count })),
    attention: {
      pastDue: pastDue.map((r) => ({
        workspaceId: r.workspaceId,
        workspaceName: r.workspaceName,
        plan: r.plan,
        since: r.since?.toISOString() ?? null,
      })),
      pastDueTotal: pastDueCount[0]?.value ?? 0,
      trialsEnding: trials.map((r) => ({
        workspaceId: r.workspaceId,
        workspaceName: r.workspaceName,
        plan: r.plan,
        // The WHERE clause cannot match a null trialEndsAt, so the fallback is unreachable.
        trialEndsAt: r.trialEndsAt?.toISOString() ?? new Date(0).toISOString(),
      })),
      trialsEndingTotal: trialCount[0]?.value ?? 0,
      staleConnections: stale.map((r) => ({
        workspaceId: r.workspaceId,
        workspaceName: r.workspaceName,
        platform: r.platform,
        accountName: r.accountName,
        lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
        isActive: r.isActive ?? true,
      })),
      staleConnectionsTotal: staleCount[0]?.value ?? 0,
      failedJobs: jobs.map((r) => ({
        workspaceId: r.workspaceId,
        workspaceName: r.workspaceName,
        jobId: r.jobId,
        type: r.type,
        error: r.error,
        failedAt: (r.completedAt ?? r.queuedAt)?.toISOString() ?? null,
      })),
      failedJobsTotal: jobCount[0]?.value ?? 0,
    },
  }
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

export interface AuditLogFilters {
  /** Only entries that changed something. The log's default view — see the comment below. */
  mutatingOnly?: boolean | undefined
  actorUserId?: string | undefined
  action?: string | undefined
  targetType?: string | undefined
  from?: Date | undefined
  to?: Date | undefined
}

/**
 * The platform audit log.
 *
 * **Reads are excluded by default.** Every admin route records a row, including the list and
 * overview pages, so views outnumber changes by a wide margin and an undifferentiated log buries
 * the handful of rows anyone is ever looking for. The reads are still there, one query parameter
 * away — the record is complete, the default view is useful, and those are not the same
 * requirement.
 *
 * "Mutating" is derived from `READ_ACTION_NAMES` in admin-audit.ts rather than from a second list
 * kept here: one definition of what counts as a read, used both to collapse repeats and to filter
 * this view.
 */
export async function listAuditLog(
  page: Page,
  filters: AuditLogFilters = {},
): Promise<Paged<AdminAuditLogEntry>> {
  const conditions = []
  if (filters.mutatingOnly) {
    conditions.push(notInArray(schema.adminAuditLog.action, [...READ_ACTION_NAMES]))
  }
  if (filters.actorUserId) conditions.push(eq(schema.adminAuditLog.actorUserId, filters.actorUserId))
  if (filters.action) conditions.push(eq(schema.adminAuditLog.action, filters.action))
  if (filters.targetType) conditions.push(eq(schema.adminAuditLog.targetType, filters.targetType))
  if (filters.from) conditions.push(gte(schema.adminAuditLog.createdAt, filters.from))
  if (filters.to) conditions.push(lte(schema.adminAuditLog.createdAt, filters.to))
  const whereClause = conditions.length ? and(...conditions) : undefined

  const [totalRow] = await db
    .select({ value: count() })
    .from(schema.adminAuditLog)
    .where(whereClause)
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
    .where(whereClause)
    .orderBy(desc(schema.adminAuditLog.createdAt))
    .limit(page.limit)
    .offset(page.offset)

  return {
    data: rows.map((r) => ({ ...r, createdAt: r.createdAt!.toISOString() })),
    total,
  }
}
