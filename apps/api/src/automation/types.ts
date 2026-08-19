import type { schema } from '@growthos/db'
import type { ActionPlatform, AutomationActionType } from '@growthos/logic'

/** A row from `automation_actions`, as the executor and adapters see it. */
export type StoredAction = typeof schema.automationActions.$inferSelect

export interface ActionTargetShape {
  platform: ActionPlatform
  campaignId?: string
  campaignName?: string
  creativeName?: string
  keyword?: string
}

export interface AdapterResult {
  ok: boolean
  /**
   * What happened, or — for the dry run — precisely what would have been sent. Stored verbatim on
   * the action so an operator can audit an automated decision after the fact.
   */
  detail: Record<string, unknown>
  error?: string
}

/**
 * One way of actually carrying out an approved action. The executor owns policy (status
 * transitions, caps, the reversibility precondition); an adapter owns nothing but the mechanics of
 * a single side effect, so a real platform integration can be added later without any of the
 * surrounding safety logic being touched or re-verified.
 */
export interface AutomationAdapter {
  readonly name: string
  execute(action: StoredAction, workspaceId: string): Promise<AdapterResult>
}

export type { AutomationActionType, ActionPlatform }
