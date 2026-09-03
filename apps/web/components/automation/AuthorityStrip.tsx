"use client";
import { ruleTerms } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { AutomationRuleRecord } from "@/lib/hooks/useAutomationQueue";
import { ACTIONS, MODES, cadenceAdverb, relativeTime, stateOf, type RuleState } from "./rules";

/**
 * What the platform is currently allowed to do — the one thing the page never said.
 *
 * The old page opened on an empty approval queue with a `0` beside it: the largest, loudest element
 * on screen described nothing at all, while the question an operator actually arrives with — *how
 * much authority have I handed this thing?* — could only be answered by reading four rule cards and
 * assembling it yourself. This is a scope gauge, not a stat card, and that is deliberate: the counts
 * on this page are almost always zero, but the scope is always meaningful.
 *
 * The encoding is ordinal and doubly redundant, so it survives greyscale, colour-blindness and a
 * white-labelled `--primary`:
 *
 *   off      empty track            graphite   "Off"
 *   suggest  half the track         ember      "Ask first"
 *   auto     the whole track        gold       "Acts alone"
 *
 * Gold for `auto` rather than a hotter ember: `--warning` is the system's caution token, and acting
 * on a customer's budget unattended is the one genuinely cautionary state this page can be in.
 * Ember stays reserved for "authority is live but you are still the gate".
 */

// Left-to-right, not bottom-up. These tracks are far wider than they are tall, and in that aspect
// a vertical fill reads as a colour-blocked slab rather than as a level — the difference between
// 55% and 100% of 48px is nearly invisible next to the difference in hue, which is exactly backwards
// for an encoding whose whole point is to survive without colour.
const FILL: Record<RuleState, { width: string; className: string }> = {
  off: { width: "0%", className: "" },
  suggest: { width: "50%", className: "bg-primary" },
  auto: { width: "100%", className: "bg-warning" },
};

/**
 * A permission list that survives being read once.
 *
 * These clauses are long and already contain their own commas ("pause campaigns that spent $50 or
 * more without returning it"), so joining them with "and" produced a garden path — the reader takes
 * "and turn converting paid search terms" as a continuation of the first clause. A colon and
 * semicolons make the boundaries unambiguous. A single permission stays plain prose.
 */
function list(parts: string[]): string {
  // Carries its own leading separator: JSX strips whitespace that sits between a newline and an
  // expression, so "it may {list}" written across two lines would render as "it maypause…".
  if (parts.length <= 1) return parts[0] ? ` ${parts[0]}` : "";
  return `: ${parts.join("; ")}`;
}

export function AuthorityStrip({
  rules,
  pendingCount,
  scheduled,
  cadenceMs,
  lastCheckedAt,
  canRun,
  onRun,
  running,
}: {
  rules: Map<string, AutomationRuleRecord>;
  /** Proposals awaiting a decision. Zero is the usual case, and this is where that is said. */
  pendingCount: number;
  /** Whether the autonomous loop is running at all — it can be paused in Settings → Automation. */
  scheduled: boolean;
  cadenceMs: number;
  lastCheckedAt: string | null;
  canRun: boolean;
  onRun: () => void;
  running: boolean;
}) {
  const states = ACTIONS.map((a) => ({ ...a, state: stateOf(rules.get(a.key)) }));
  const onCount = states.filter((s) => s.state !== "off").length;

  const asking = states.filter((s) => s.state === "suggest");
  const acting = states.filter((s) => s.state === "auto");
  const offList = states.filter((s) => s.state === "off");

  const permission = (key: (typeof states)[number]["key"]) =>
    ruleTerms(key, rules.get(key) ?? null).permission;

  // Next check is derived from this workspace's own cadence, not from the cron interval. The tick
  // fires hourly but only plans a workspace whose last run is older than its cadence, so quoting
  // the interval — as the old empty state did with "the hourly run" — overstates it by up to a week.
  const nextAt = lastCheckedAt ? new Date(lastCheckedAt).getTime() + cadenceMs : null;
  const overdue = nextAt !== null && nextAt <= Date.now();

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Standing orders
          </p>
          <h2 className="mt-1.5 font-display text-xl font-semibold tracking-tight">
            <span className={cn(onCount === 0 && "text-muted-foreground")}>
              {onCount} of {ACTIONS.length}
            </span>{" "}
            switched on
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Claiming "checks weekly" while the loop is paused in Settings would be the same class
              of untruth as the old "hourly run" line. If it is not running, say so. */}
          <p className="font-mono text-[11px] text-muted-foreground">
            {scheduled ? (
              <>
                Checks {cadenceAdverb(cadenceMs)}
                {lastCheckedAt && ` · checked ${relativeTime(lastCheckedAt)}`}
                {nextAt !== null && ` · next ${overdue ? "due now" : relativeTime(nextAt)}`}
              </>
            ) : (
              <span className="text-warning">Scheduled checks are paused in Settings</span>
            )}
          </p>
          {canRun && (
            <Button size="sm" variant="outline" onClick={onRun} disabled={running}>
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", running && "animate-spin")} />
              {running ? "Checking…" : "Check now"}
            </Button>
          )}
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {states.map((s) => {
          const fill = FILL[s.state];
          const mode = MODES.find((m) => m.key === s.state)!;
          return (
            <li key={s.key}>
              <a
                href={`#rule-${s.key}`}
                className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`${s.label}: ${mode.label}. ${mode.blurb} Go to this standing order.`}
              >
                {/* The track is the whole authority a rule could have; the fill is what it has. */}
                {/* `border-border` is not enough here. `--secondary` sits 1.12:1 from `--card` in
                    light and 1.11:1 in dark, and `--border` only reaches 1.23:1 against the dark card
                    — so an *off* track, which is nothing but its own outline, all but vanished. A
                    translucent foreground inverts with the theme and lands near 2:1 in both, which no
                    fixed token does. (The state is still carried in text below the track, so the
                    outline never has to be the only thing saying it.) */}
                <div className="relative h-10 overflow-hidden rounded-md border border-foreground/25 bg-secondary transition-colors group-hover:border-foreground/45">
                  {/* A floor, so an unfilled track reads as a gauge sitting at zero rather than as
                      an empty placeholder that failed to load. */}
                  <div className="absolute inset-y-0 left-0 w-0.5 bg-foreground/35" aria-hidden />
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 transition-[width] duration-500 ease-out motion-reduce:transition-none",
                      fill.className,
                    )}
                    style={{ width: fill.width }}
                    aria-hidden
                  />
                </div>
                {/* Wraps rather than truncates. At two columns on a phone "Turn search terms into
                    briefs" clips to "Turn search ter…", and a label that names nothing is worse than
                    a label on two lines. */}
                <p className="mt-2 text-xs font-medium leading-tight">{s.label}</p>
                <p
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.08em]",
                    s.state === "off" && "text-muted-foreground",
                    s.state === "suggest" && "text-primary",
                    s.state === "auto" && "text-warning",
                  )}
                >
                  {mode.label}
                </p>
              </a>
            </li>
          );
        })}
      </ul>

      {/* The gauge shows how much; this says what. Thresholds come from the planner's own
          constants via ruleTerms(), so a workspace that raised its ROAS floor reads its own number. */}
      <div className="mt-6 space-y-1.5 border-t pt-4 text-sm">
        {onCount === 0 ? (
          <p className="text-muted-foreground">
            It may do nothing at all. Switch a standing order on below to give it a job.
          </p>
        ) : (
          <>
            {acting.length > 0 && (
              <p>
                <span className="font-medium text-warning">Without asking,</span> it may
                {list(acting.map((s) => permission(s.key)))}.
              </p>
            )}
            {asking.length > 0 && (
              <p>
                <span className="font-medium text-primary">With your approval,</span> it may
                {list(asking.map((s) => permission(s.key)))}.
              </p>
            )}
          </>
        )}
        {offList.length > 0 && onCount > 0 && (
          <p className="text-muted-foreground">
            It may not{list(offList.map((s) => permission(s.key)))}.
          </p>
        )}
        {/* The queue's empty state lives here rather than in a card of its own. A separate panel
            whose entire content was the word "0" was the largest element on the old page, and it
            said less than this line does. When proposals exist they render above this, where a
            decision with a deadline belongs. */}
        {pendingCount === 0 && onCount > 0 && (
          <p className="pt-1 text-muted-foreground">Nothing is waiting on your decision.</p>
        )}
      </div>
    </Card>
  );
}
