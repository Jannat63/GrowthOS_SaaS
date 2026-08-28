import type { CampaignInsight } from "./google-ads-advisor.js";
import type { FatigueStatus } from "./creative-fatigue.js";
import type { AnalyzedSearchTerm } from "./search-terms-bridge.js";

/**
 * Automation planner (M4 · P4.3a) — turns the signals the app already computes into concrete
 * proposed actions.
 *
 * Pure by design, like every engine here: no I/O, no clock, no database. It receives signals, the
 * workspace's rules, and the small amount of state needed to stay idempotent (what is already open,
 * what has already been proposed today), and returns proposals. Everything about *executing* those
 * proposals — approval, adapters, platform credentials — lives in apps/api and is deliberately not
 * this module's problem, which is what makes the decision logic testable without an ad account.
 *
 * Two ideas are load-bearing:
 *
 *  - **Reversibility.** An action that changes existing state must carry `previousValue`, so it can
 *    be undone and so an operator reviewing the queue can see what it is about to overwrite.
 *    Additive actions (queueing a content brief) have nothing to overwrite and are exempt — see
 *    `requiresPreviousValue`.
 *  - **Caps bound the proposal, not just the execution.** A budget increase is clamped here, at
 *    planning time, so what a human approves in the queue is exactly what will be sent. The executor
 *    re-checks independently, because a rule can be edited between proposal and approval.
 */

export type AutomationActionType =
  | "pause_campaign"
  | "adjust_budget"
  | "refresh_creative"
  | "queue_content";

export type AutomationMode = "suggest" | "auto";

// Every optional below spells out `| undefined` because these types are populated from zod-parsed
// request bodies and from jsonb columns, where an absent field arrives as present-and-undefined.
// Under `exactOptionalPropertyTypes` that is distinct from missing, and omitting it makes the type
// unusable at exactly the boundary it exists to describe.
export interface AutomationCaps {
  /** Hard ceiling on any single budget move, in percent. Defaults to 20. */
  maxChangePercent?: number | undefined;
  /** Ceiling on proposals of this action type per day. Unlimited when unset. */
  maxActionsPerDay?: number | undefined;
  /** A budget move may never take a campaign's daily spend below this. */
  minDailyBudget?: number | undefined;
}

export interface AutomationThreshold {
  /** pause_campaign: only campaigns wasting at least this much. Default 50. */
  minWastedSpend?: number | undefined;
  /** adjust_budget: only scale campaigns at or above this ROAS. Default 3. */
  minRoas?: number | undefined;
  /** adjust_budget: how much to raise, before caps. Default 20. */
  budgetIncreasePercent?: number | undefined;
  /** queue_content: minimum paid conversions before a term earns a brief. Default 1. */
  minConversions?: number | undefined;
}

export interface AutomationRule {
  actionType: AutomationActionType;
  enabled: boolean;
  mode: AutomationMode;
  threshold?: AutomationThreshold | null | undefined;
  caps?: AutomationCaps | null | undefined;
}

export type ActionPlatform = "google_ads" | "meta_ads" | "content";

export interface ActionTarget {
  platform: ActionPlatform;
  campaignId?: string;
  campaignName?: string;
  creativeName?: string;
  keyword?: string;
}

export interface ProposedAction {
  actionType: AutomationActionType;
  target: ActionTarget;
  payload: Record<string, unknown>;
  /** null only for additive actions — see requiresPreviousValue. */
  previousValue: Record<string, unknown> | null;
  /** Deterministic, human-readable justification. No LLM (D4). */
  reason: string;
  /** True when the rule is in `auto` mode; the executor still re-checks caps. */
  autoApprove: boolean;
}

/**
 * Exactly the creative fields the planner reads — deliberately narrower than `FatigueResult`.
 *
 * The API surfaces fatigue as `ScoredCreative` (no `hoursSinceLaunch`) while the engine produces
 * `FatigueResult` (with it). Both satisfy this, so the planner accepts either without a cast, and
 * asking for fields it never reads would have been a false dependency.
 */
export interface FatigueSignal {
  name: string;
  status: FatigueStatus;
  frequency: number;
  ctrThisWeek: number;
  ctrDeclinePercent: number;
}

export interface PlannerSignals {
  googleCampaigns?: CampaignInsight[];
  metaCampaigns?: CampaignInsight[];
  creatives?: FatigueSignal[];
  searchTerms?: AnalyzedSearchTerm[];
}

export interface PlannerState {
  /** targetKey() of every action currently awaiting approval or execution. */
  openTargetKeys?: string[];
  /** How many actions of each type have already been proposed in the current day. */
  proposedTodayByType?: Partial<Record<AutomationActionType, number>>;
}

/** Actions that overwrite existing state, and therefore may not execute without a previousValue. */
const MUTATING_ACTIONS: ReadonlySet<AutomationActionType> = new Set([
  "pause_campaign",
  "adjust_budget",
  "refresh_creative",
]);

export function requiresPreviousValue(actionType: AutomationActionType): boolean {
  return MUTATING_ACTIONS.has(actionType);
}

/**
 * Stable identity for "this action against this thing". Used to avoid proposing a second action
 * against a target that already has one open. Shared by the planner and the API so both agree.
 */
export function targetKey(actionType: AutomationActionType, target: ActionTarget): string {
  const subject = target.campaignId ?? target.creativeName ?? target.keyword ?? "";
  return `${actionType}:${target.platform}:${subject}`;
}

/**
 * The thresholds a rule falls back to when nobody has tuned it.
 *
 * Exported because the UI has to tell an operator what a rule will actually do before they switch
 * it on — "Pause wasted campaigns" is not a description of anything until you know it means
 * "spent $50 or more". Every one of these numbers used to exist only as a `?? 50` buried in a
 * planner function, so the screen either said nothing or said something it had re-typed by hand.
 * `ruleTerms()` below reads exactly these, so what a rule promises and what it does cannot drift.
 */
export const RULE_DEFAULTS = {
  /** pause_campaign: a campaign must have wasted at least this much. */
  minWastedSpend: 50,
  /** adjust_budget: only scale campaigns at or above this ROAS. */
  minRoas: 3,
  /** adjust_budget: how much to raise, before caps. */
  budgetIncreasePercent: 20,
  /** adjust_budget: hard ceiling on any single budget move, in percent. */
  maxChangePercent: 20,
  /** queue_content: minimum paid conversions before a term earns a brief. */
  minConversions: 1,
} as const;

const DEFAULT_MAX_CHANGE_PERCENT = RULE_DEFAULTS.maxChangePercent;
const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `$${round2(n).toLocaleString("en-US")}`;

/** What a rule watches for, what it does about it, and whether that overwrites anything. */
export interface RuleTerms {
  /** The condition that makes this rule propose something, with its live thresholds filled in. */
  condition: string;
  /** What it proposes when the condition holds. */
  effect: string;
  /** A short verb phrase for "it may ___", used to build the summary sentence. */
  permission: string;
  /** True when approving changes existing state rather than only creating a record. */
  mutating: boolean;
}

/**
 * The plain-English terms of one rule, with the numbers that are actually in force.
 *
 * Reads the rule's own threshold/caps where set and `RULE_DEFAULTS` where not, so a workspace that
 * raised `minRoas` to 5 sees "returning 5x or better" rather than the stock sentence. `refresh_creative`
 * carries no numbers on purpose: the planner filters on `status === "fatigued"`, a verdict the
 * fatigue engine reaches on its own, so quoting a threshold here would invent one.
 */
export function ruleTerms(
  actionType: AutomationActionType,
  rule?: { threshold?: AutomationThreshold | null | undefined; caps?: AutomationCaps | null | undefined } | null,
): RuleTerms {
  const t = rule?.threshold;
  const mutating = requiresPreviousValue(actionType);

  switch (actionType) {
    case "pause_campaign": {
      const min = t?.minWastedSpend ?? RULE_DEFAULTS.minWastedSpend;
      return {
        condition: `A campaign has spent ${money(min)} or more and is not returning it.`,
        effect: "Pause it.",
        permission: `pause campaigns that spent ${money(min)} or more without returning it`,
        mutating,
      };
    }
    case "adjust_budget": {
      const minRoas = t?.minRoas ?? RULE_DEFAULTS.minRoas;
      const requested = t?.budgetIncreasePercent ?? RULE_DEFAULTS.budgetIncreasePercent;
      const ceiling = rule?.caps?.maxChangePercent ?? RULE_DEFAULTS.maxChangePercent;
      const move = Math.min(requested, ceiling);
      return {
        condition: `A campaign is returning ${round2(minRoas)}x or better.`,
        effect: `Raise its daily budget ${move}% — never more than ${ceiling}% in one move.`,
        permission: `raise budgets ${move}% on campaigns returning ${round2(minRoas)}x or better`,
        mutating,
      };
    }
    case "refresh_creative":
      return {
        condition: "A creative's click-through rate has collapsed against its own recent average.",
        effect: "Flag it for replacement.",
        permission: "flag creatives whose click-through rate has collapsed",
        mutating,
      };
    case "queue_content": {
      const min = t?.minConversions ?? RULE_DEFAULTS.minConversions;
      return {
        condition: `A paid search term converted ${min} time${min === 1 ? "" : "s"} or more with no organic page behind it.`,
        effect: "Write a content brief for it.",
        permission: "turn converting paid search terms into content briefs",
        mutating,
      };
    }
  }
}

function planPauseCampaign(
  rule: AutomationRule,
  campaigns: CampaignInsight[],
  platform: ActionPlatform,
): ProposedAction[] {
  const minWastedSpend = rule.threshold?.minWastedSpend ?? RULE_DEFAULTS.minWastedSpend;
  return campaigns
    .filter((c) => c.status === "wasted" && c.cost >= minWastedSpend)
    .map((c) => ({
      actionType: "pause_campaign" as const,
      target: { platform, campaignId: c.id, campaignName: c.name },
      payload: { status: "PAUSED" },
      // What the pause overwrites. Recorded so the action can be reversed and so the queue shows
      // an operator exactly what state they are leaving behind.
      previousValue: { status: "ENABLED", cost: c.cost, conversions: c.conversions },
      reason:
        c.conversions === 0
          ? `${c.name} spent ${money(c.cost)} with no conversions.`
          : `${c.name} spent ${money(c.cost)} for ${c.conversions} conversion${c.conversions === 1 ? "" : "s"} (CPA ${money(c.cpa)}).`,
      autoApprove: rule.mode === "auto",
    }));
}

function planAdjustBudget(
  rule: AutomationRule,
  campaigns: CampaignInsight[],
  platform: ActionPlatform,
): ProposedAction[] {
  const minRoas = rule.threshold?.minRoas ?? RULE_DEFAULTS.minRoas;
  const requested = rule.threshold?.budgetIncreasePercent ?? RULE_DEFAULTS.budgetIncreasePercent;
  const ceiling = rule.caps?.maxChangePercent ?? DEFAULT_MAX_CHANGE_PERCENT;
  // Clamp at planning time so the queue shows the real number a human is approving.
  const changePercent = Math.min(requested, ceiling);

  if (changePercent <= 0) return [];

  return campaigns
    .filter((c) => c.status === "scale" && c.roas >= minRoas)
    .map((c) => ({
      actionType: "adjust_budget" as const,
      target: { platform, campaignId: c.id, campaignName: c.name },
      payload: { changePercent, newSpendEstimate: round2(c.cost * (1 + changePercent / 100)) },
      previousValue: { cost: c.cost, roas: c.roas },
      reason: `${c.name} is returning ${c.roas}x on ${money(c.cost)} — raise budget ${changePercent}%.`,
      autoApprove: rule.mode === "auto",
    }));
}

function planRefreshCreative(rule: AutomationRule, creatives: FatigueSignal[]): ProposedAction[] {
  return creatives
    .filter((c) => c.status === "fatigued")
    .map((c) => ({
      actionType: "refresh_creative" as const,
      target: { platform: "meta_ads" as const, creativeName: c.name },
      payload: { action: "refresh" },
      previousValue: {
        ctrThisWeek: c.ctrThisWeek,
        frequency: c.frequency,
        ctrDeclinePercent: c.ctrDeclinePercent,
      },
      reason: `${c.name}: CTR down ${round2(c.ctrDeclinePercent)}% at frequency ${c.frequency}.`,
      autoApprove: rule.mode === "auto",
    }));
}

function planQueueContent(rule: AutomationRule, terms: AnalyzedSearchTerm[]): ProposedAction[] {
  const minConversions = rule.threshold?.minConversions ?? RULE_DEFAULTS.minConversions;
  return terms
    .filter(
      (t) =>
        t.recommendation.type === "paid-proven-organic-needed" && t.conversions >= minConversions,
    )
    .map((t) => ({
      actionType: "queue_content" as const,
      target: { platform: "content" as const, keyword: t.term },
      payload: { keyword: t.term, conversions: t.conversions, cost: t.cost },
      // Additive: a new content brief overwrites nothing.
      previousValue: null,
      reason: `"${t.term}" converts in paid (${t.conversions} conversion${t.conversions === 1 ? "" : "s"}, ${money(t.cost)}) with no organic coverage.`,
      autoApprove: rule.mode === "auto",
    }));
}

/**
 * Plan every action the workspace's enabled rules justify, minus anything already open and anything
 * over a daily cap. Rules are applied in a fixed order so output is deterministic for a given input.
 */
export function planActions(
  signals: PlannerSignals,
  rules: AutomationRule[],
  state: PlannerState = {},
): ProposedAction[] {
  const open = new Set(state.openTargetKeys ?? []);
  const proposed: ProposedAction[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    let candidates: ProposedAction[] = [];
    switch (rule.actionType) {
      case "pause_campaign":
        candidates = [
          ...planPauseCampaign(rule, signals.googleCampaigns ?? [], "google_ads"),
          ...planPauseCampaign(rule, signals.metaCampaigns ?? [], "meta_ads"),
        ];
        break;
      case "adjust_budget":
        candidates = [
          ...planAdjustBudget(rule, signals.googleCampaigns ?? [], "google_ads"),
          ...planAdjustBudget(rule, signals.metaCampaigns ?? [], "meta_ads"),
        ];
        break;
      case "refresh_creative":
        candidates = planRefreshCreative(rule, signals.creatives ?? []);
        break;
      case "queue_content":
        candidates = planQueueContent(rule, signals.searchTerms ?? []);
        break;
    }

    // Never stack a second action on a target that already has one awaiting a decision.
    candidates = candidates.filter((a) => !open.has(targetKey(a.actionType, a.target)));

    const cap = rule.caps?.maxActionsPerDay;
    if (cap !== undefined) {
      const alreadyToday = state.proposedTodayByType?.[rule.actionType] ?? 0;
      const room = Math.max(0, cap - alreadyToday);
      candidates = candidates.slice(0, room);
    }

    proposed.push(...candidates);
  }

  return proposed;
}
