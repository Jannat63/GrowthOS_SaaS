"use client";
import { useState } from "react";
import { ruleTerms, type AutomationActionType } from "@growthos/logic";
import { Button } from "@growthos/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@growthos/ui/components/dialog";
import { cn } from "@/lib/utils/cn";
import type { AutomationRuleRecord } from "@/lib/hooks/useAutomationQueue";
import { ACTION_BY_KEY, MODES, stateOf, type RuleState } from "./rules";

/**
 * One standing order: what it watches for, what it does, and how much rope it has.
 *
 * Two things were missing and both mattered more than the styling.
 *
 * **The condition.** "Pause wasted campaigns / Pause campaigns spending without returning" is not a
 * description of anything — it never said that "wasted" means *$50 or more*. A person was being
 * asked to authorise pausing their own campaigns against a rule whose trigger was invisible. The
 * when/then now comes from `ruleTerms()`, which reads the planner's own thresholds.
 *
 * **The mode.** The API has supported `suggest` and `auto` since P4.3a, and the page went as far as
 * explaining the difference between them in a paragraph — while shipping a single Turn on / Turn off
 * button that always sent `suggest`. Teaching a vocabulary you cannot act on is worse than not
 * mentioning it. The control is now the dial the copy always described.
 */

const ICON_TONE: Record<RuleState, string> = {
  off: "bg-secondary text-muted-foreground",
  suggest: "bg-primary/10 text-primary",
  auto: "bg-warning/10 text-warning",
};

export function RuleCard({
  actionType,
  rule,
  canEdit,
  pending,
  onChange,
}: {
  actionType: AutomationActionType;
  rule: AutomationRuleRecord | undefined;
  canEdit: boolean;
  pending: boolean;
  onChange: (next: RuleState) => void;
}) {
  const meta = ACTION_BY_KEY.get(actionType)!;
  const terms = ruleTerms(actionType, rule ?? null);
  const state = stateOf(rule);
  const Icon = meta.icon;

  // Handing over unattended authority is the decision worth interrupting — not approving a single
  // proposal you can already read in full. The friction goes where the risk is.
  const [confirming, setConfirming] = useState(false);

  function select(next: RuleState) {
    if (next === state) return;
    if (next === "auto") {
      setConfirming(true);
      return;
    }
    onChange(next);
  }

  return (
    <div
      id={`rule-${actionType}`}
      className={cn(
        "scroll-mt-24 rounded-lg border p-4 transition-colors",
        state === "suggest" && "border-primary/30",
        state === "auto" && "border-warning/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            ICON_TONE[state],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{meta.label}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {meta.scope}
          </p>
        </div>
      </div>

      <dl className="mt-3.5 space-y-1.5 text-sm">
        <div className="flex gap-3">
          <dt className="w-10 shrink-0 pt-px font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            When
          </dt>
          <dd className="text-muted-foreground">{terms.condition}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-10 shrink-0 pt-px font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Then
          </dt>
          <dd>{terms.effect}</dd>
        </div>
      </dl>

      <div className="mt-4">
        {canEdit ? (
          <div
            role="group"
            aria-label={`${meta.label} — how much authority`}
            className="inline-flex rounded-lg border p-0.5"
          >
            {MODES.map((m) => {
              const active = m.key === state;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => select(m.key)}
                  aria-pressed={active}
                  disabled={pending}
                  title={m.blurb}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    "disabled:opacity-50",
                    !active && "text-muted-foreground hover:text-foreground",
                    active && m.key === "off" && "bg-secondary text-foreground",
                    active && m.key === "suggest" && "bg-primary/10 text-primary",
                    active && m.key === "auto" && "bg-warning/10 text-warning",
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        ) : (
          // Silently withholding the control taught a manager nothing except that the page looked
          // broken. Show the state, and say who can change it.
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {MODES.find((m) => m.key === state)!.label}.
            </span>{" "}
            An admin can change this.
          </p>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Let it act without asking?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2.5 text-left">
                <p>
                  {terms.condition} {terms.effect} No proposal, no approval — it happens and you read
                  about it afterwards in the ledger.
                </p>
                <p>
                  {terms.mutating
                    ? "This changes live campaign settings on your connected accounts."
                    : "This only creates records inside GrowthOS."}{" "}
                  You can switch it back to asking first at any time.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                onChange("auto");
              }}
            >
              Let it act alone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
