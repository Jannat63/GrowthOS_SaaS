import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { executeAction } from './executor.js'
import { approveAction, rejectAction, listActions } from './actions.js'
import { upsertRule } from './rules.js'

// Integration: requires Neon. Covers the executor's safety gates and the two adapters that exist
// today. These are the tests that matter most in this subsystem — everything here guards against a
// class of bug whose consequence is spending a customer's money incorrectly.

const ws = 'test-automation-ws'
const userId = 'test-automation-user'

type NewAction = typeof schema.automationActions.$inferInsert

async function insertAction(over: Partial<NewAction> = {}) {
  const [row] = await db
    .insert(schema.automationActions)
    .values({
      workspaceId: ws,
      actionType: 'pause_campaign',
      status: 'approved',
      target: { platform: 'google_ads', campaignId: 'c-1', campaignName: 'Search - Brand' },
      payload: { status: 'PAUSED' },
      previousValue: { status: 'ENABLED', cost: 500 },
      reason: 'Spent $500 with no conversions.',
      ...over,
    })
    .returning()
  return row!
}

describe('automation', () => {
  beforeEach(async () => {
    await db.delete(schema.automationActions).where(eq(schema.automationActions.workspaceId, ws))
  })

  afterAll(async () => {
    await db.delete(schema.automationActions).where(eq(schema.automationActions.workspaceId, ws))
    await db.delete(schema.automationRules).where(eq(schema.automationRules.workspaceId, ws))
    await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
  })

  describe('executor gates', () => {
    it('refuses to execute anything that is not approved', async () => {
      const action = await insertAction({ status: 'proposed' })
      await expect(executeAction(ws, action.id)).rejects.toThrow(/Only an approved action/)
    })

    it('refuses to replay an action that already executed', async () => {
      const action = await insertAction({ status: 'executed' })
      await expect(executeAction(ws, action.id)).rejects.toThrow(/'executed'/)
    })

    it('refuses a state-changing action that cannot say what it would overwrite', async () => {
      const action = await insertAction({ previousValue: null })
      await expect(executeAction(ws, action.id)).rejects.toThrow(/cannot be undone/)

      // And it stays approved rather than being marked failed — nothing was attempted.
      const [after] = await db
        .select({ status: schema.automationActions.status })
        .from(schema.automationActions)
        .where(eq(schema.automationActions.id, action.id))
      expect(after!.status).toBe('approved')
    })

    it('allows an additive action with no previousValue', async () => {
      const action = await insertAction({
        actionType: 'queue_content',
        target: { platform: 'content', keyword: 'automation gate test keyword' },
        payload: { keyword: 'automation gate test keyword' },
        previousValue: null,
      })
      const done = await executeAction(ws, action.id)
      expect(done.status).toBe('executed')
    })

    it("refuses a budget change that the rule's cap no longer permits", async () => {
      const rule = await upsertRule(ws, {
        actionType: 'adjust_budget',
        caps: { maxChangePercent: 10 },
      })
      // Approved at 20% while the rule now allows 10 — the operator approved a different thing.
      const action = await insertAction({
        actionType: 'adjust_budget',
        ruleId: rule.id,
        payload: { changePercent: 20 },
        previousValue: { cost: 1000 },
      })
      await expect(executeAction(ws, action.id)).rejects.toThrow(/cap is now 10%/)
    })

    it('permits a budget change still inside the cap', async () => {
      const rule = await upsertRule(ws, {
        actionType: 'adjust_budget',
        caps: { maxChangePercent: 25 },
      })
      const action = await insertAction({
        actionType: 'adjust_budget',
        ruleId: rule.id,
        payload: { changePercent: 20 },
        previousValue: { cost: 1000 },
      })
      const done = await executeAction(ws, action.id)
      expect(done.status).toBe('executed')
    })

    it('scopes by workspace — another workspace cannot execute this action', async () => {
      const action = await insertAction()
      await expect(executeAction('some-other-ws', action.id)).rejects.toThrow(/not found/i)
    })
  })

  describe('dry-run adapter', () => {
    it('records exactly what it would have sent, and changes nothing', async () => {
      const action = await insertAction()
      const done = await executeAction(ws, action.id)

      expect(done.status).toBe('executed')
      const result = done.result as Record<string, unknown>
      expect(result.adapter).toBe('dry-run')
      expect(result.dryRun).toBe(true)
      expect(result.wouldHaveSent).toMatchObject({
        actionType: 'pause_campaign',
        payload: { status: 'PAUSED' },
      })
    })
  })

  describe('content-queue adapter', () => {
    const keyword = 'test automation ergonomic desk'

    it('creates a real content brief', async () => {
      const action = await insertAction({
        actionType: 'queue_content',
        target: { platform: 'content', keyword },
        payload: { keyword },
        previousValue: null,
      })
      const done = await executeAction(ws, action.id)

      expect(done.status).toBe('executed')
      expect((done.result as Record<string, unknown>).created).toBe(true)

      const briefs = await db
        .select()
        .from(schema.contentBriefs)
        .where(eq(schema.contentBriefs.workspaceId, ws))
      expect(briefs.some((b) => b.keyword === keyword)).toBe(true)
    })

    it('skips rather than duplicating when the keyword already has a brief', async () => {
      const action = await insertAction({
        actionType: 'queue_content',
        target: { platform: 'content', keyword },
        payload: { keyword },
        previousValue: null,
      })
      const done = await executeAction(ws, action.id)

      expect(done.status).toBe('executed')
      const result = done.result as Record<string, unknown>
      expect(result.skipped).toBe(true)
    })
  })

  describe('approve / reject', () => {
    it('approves once — a second approval of the same action is refused', async () => {
      const action = await insertAction({ status: 'proposed' })

      const approved = await approveAction(ws, action.id, userId)
      expect(approved.status).toBe('executed')
      expect(approved.approvedBy).toBe(userId)

      await expect(approveAction(ws, action.id, userId)).rejects.toThrow(/no longer awaiting/)
    })

    it('rejects a proposal, and it can never then be approved', async () => {
      const action = await insertAction({ status: 'proposed' })

      const rejected = await rejectAction(ws, action.id, userId)
      expect(rejected.status).toBe('rejected')

      await expect(approveAction(ws, action.id, userId)).rejects.toThrow(/no longer awaiting/)
    })
  })

  describe('listActions', () => {
    it('filters by status and reports the full total for that filter', async () => {
      await insertAction({ status: 'proposed' })
      await insertAction({ status: 'proposed', target: { platform: 'google_ads', campaignId: 'c-2' } })
      await insertAction({ status: 'rejected' })

      const proposed = await listActions(ws, { limit: 100, offset: 0 }, 'proposed')
      expect(proposed.total).toBe(2)
      expect(proposed.data.every((a) => a.status === 'proposed')).toBe(true)

      const all = await listActions(ws, { limit: 100, offset: 0 })
      expect(all.total).toBe(3)
    })
  })
})
