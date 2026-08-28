import { channelLabel, type AutomationActionType } from "@growthos/logic";
import { FileText, PauseCircle, RefreshCw, TrendingUp } from "lucide-react";
import type { AutomationActionRecord } from "@/lib/hooks/useAutomationQueue";

/**
 * Presentation for the four things automation is allowed to do.
 *
 * The thresholds and the wording of what each rule *does* are not here — they come from
 * `ruleTerms()` in `@growthos/logic`, which reads the same constants the planner filters on. Only
 * naming, iconography and the scope each rule reaches live in this file, because those are choices
 * about the screen rather than about the engine.
 */

/** A rule's three states. `off` is stored as `enabled: false`; the other two as a mode. */
export type RuleState = "off" | "suggest" | "auto";

export const ACTIONS: {
  key: AutomationActionType;
  /** What the rule is called. A noun phrase — it names a standing order, not a button. */
  label: string;
  icon: typeof PauseCircle;
  /** Which platforms it can reach, so nobody has to guess whether it touches their Google account. */
  scope: string;
}[] = [
  {
    key: "pause_campaign",
    label: "Pause wasted spend",
    icon: PauseCircle,
    scope: `${channelLabel("google_ads")} and ${channelLabel("meta_ads")}`,
  },
  {
    key: "adjust_budget",
    label: "Scale what is working",
    icon: TrendingUp,
    scope: `${channelLabel("google_ads")} and ${channelLabel("meta_ads")}`,
  },
  {
    // Only ever proposed against meta_ads — the planner hardcodes that platform, so promising both
    // would describe a reach this rule does not have.
    key: "refresh_creative",
    label: "Flag tired creative",
    icon: RefreshCw,
    scope: channelLabel("meta_ads"),
  },
  {
    key: "queue_content",
    label: "Turn search terms into briefs",
    icon: FileText,
    scope: "Content pipeline",
  },
];

export const ACTION_BY_KEY = new Map(ACTIONS.map((a) => [a.key, a]));

/**
 * The three states, in ascending order of authority.
 *
 * `suggest` and `auto` are the API's two modes and the page already explained the difference
 * between them — while offering no control that could select one. Off is the absence of a rule
 * rather than a third mode, but to a person deciding how much rope to hand over it is the first
 * notch on the same dial, so it belongs on the same control.
 */
export const MODES: { key: RuleState; label: string; blurb: string }[] = [
  { key: "off", label: "Off", blurb: "Proposes nothing." },
  { key: "suggest", label: "Ask first", blurb: "Queues proposals for you to approve." },
  { key: "auto", label: "Act alone", blurb: "Runs without asking, within its caps." },
];

export function stateOf(rule?: { enabled: boolean; mode: "suggest" | "auto" } | null): RuleState {
  if (!rule?.enabled) return "off";
  return rule.mode === "auto" ? "auto" : "suggest";
}

export const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "4 days ago" / "in 3 hours". Anything under a minute is "just now" rather than "in 0 seconds". */
export function relativeTime(iso: string | number | Date): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const delta = then - Date.now();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(delta) >= ms) return RELATIVE.format(Math.round(delta / ms), unit);
  }
  return delta < 0 ? "just now" : "any moment";
}

/** A cadence as an adverb: "hourly", "daily", "weekly", or "every 6 hours". */
export function cadenceAdverb(ms: number): string {
  if (ms === 3_600_000) return "hourly";
  if (ms === 86_400_000) return "daily";
  if (ms === 7 * 86_400_000) return "weekly";
  const hours = Math.round(ms / 3_600_000);
  return hours < 48 ? `every ${hours} hours` : `every ${Math.round(hours / 24)} days`;
}

/**
 * One line of evidence on a proposal: a figure, and where it is going if the proposal changes it.
 *
 * The page used to print `previousValue` and `payload` as raw `JSON.stringify` output —
 * `{"status":"ENABLED","cost":842.5,"conversions":0} → {"status":"PAUSED"}` — as the primary
 * evidence for a decision about someone's ad spend. The shapes are known and fixed (the planner
 * writes them), so they can be read properly instead of dumped.
 */
export interface ProposalFact {
  label: string;
  from: string;
  /** Set only where this is a genuine before → after, so the arrow means something everywhere it appears. */
  to?: string;
  /** A qualifier on `to`, kept separate so it can wrap onto its own line on a phone. */
  note?: string;
}

const num = (v: unknown, fallback = 0): number => (typeof v === "number" ? v : fallback);

export function proposalFacts(action: AutomationActionRecord): ProposalFact[] {
  const prev = action.previousValue ?? {};
  const next = action.payload ?? {};

  switch (action.actionType) {
    case "pause_campaign":
      return [
        { label: "Spend", from: money(num(prev.cost)) },
        { label: "Conversions", from: String(num(prev.conversions)) },
        { label: "Status", from: "Running", to: "Paused" },
      ];
    case "adjust_budget": {
      const change = num(next.changePercent);
      return [
        { label: "Return", from: `${num(prev.roas)}x` },
        {
          label: "Spend",
          from: money(num(prev.cost)),
          to: money(num(next.newSpendEstimate)),
          note: `+${change}%`,
        },
      ];
    }
    case "refresh_creative":
      return [
        { label: "Click-through", from: `${num(prev.ctrThisWeek)}%` },
        { label: "Down", from: `${Math.round(num(prev.ctrDeclinePercent))}%` },
        { label: "Frequency", from: `${num(prev.frequency)}×` },
        { label: "Status", from: "Running", to: "Flagged" },
      ];
    case "queue_content":
      return [
        { label: "Paid conversions", from: String(num(next.conversions)) },
        { label: "Paid cost", from: money(num(next.cost)) },
        { label: "Creates", from: "One content brief" },
      ];
    default:
      return [];
  }
}

/** What a proposal is about: a campaign, a creative, or a keyword. */
export function subjectOf(action: AutomationActionRecord): string {
  return (
    action.target.campaignName ??
    action.target.creativeName ??
    (action.target.keyword ? `“${action.target.keyword}”` : null) ??
    "—"
  );
}
