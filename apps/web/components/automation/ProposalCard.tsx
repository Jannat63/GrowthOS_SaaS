"use client";
import { channelLabel } from "@growthos/logic";
import { Button } from "@growthos/ui/components/button";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { AutomationActionRecord } from "@/lib/hooks/useAutomationQueue";
import { ACTION_BY_KEY, proposalFacts, subjectOf } from "./rules";

/** The approve button says what approving does, so the verb is on the control and not only above it. */
const APPROVE_VERB: Record<string, string> = {
  pause_campaign: "Approve pause",
  adjust_budget: "Approve increase",
  refresh_creative: "Approve flag",
  queue_content: "Approve brief",
};

/**
 * One proposal, with the evidence a person needs to decide on it.
 *
 * The row this replaces printed its evidence as `JSON.stringify(previousValue) → JSON.stringify(payload)`:
 *
 *     {"status":"ENABLED","cost":842.5,"conversions":0} → {"status":"PAUSED"}
 *
 * That is a developer's debug output standing in as the primary basis for a decision about someone's
 * ad spend. The shapes are fixed and written by the planner, so `proposalFacts()` reads them by name
 * instead. The arrow survives, but only on the one line where a value genuinely changes — when every
 * line has an arrow the arrow stops meaning anything.
 */
export function ProposalCard({
  action,
  canDecide,
  deciding,
  onApprove,
  onReject,
}: {
  action: AutomationActionRecord;
  canDecide: boolean;
  /** "approve" | "reject" while this row's own request is in flight, else null. */
  deciding: "approve" | "reject" | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const meta = ACTION_BY_KEY.get(action.actionType);
  const Icon = meta?.icon;
  const facts = proposalFacts(action);
  const busy = deciding !== null;

  return (
    <li className="rounded-lg border border-primary/25 bg-primary/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && (
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">{meta?.label ?? action.actionType}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {channelLabel(action.target.platform)} · {subjectOf(action)}
            </p>
          </div>
        </div>

        {canDecide && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" disabled={busy} onClick={onApprove}>
              <Check className="mr-1 h-3.5 w-3.5" />
              {deciding === "approve"
                ? "Approving…"
                : (APPROVE_VERB[action.actionType] ?? "Approve")}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>
              <X className="mr-1 h-3.5 w-3.5" />
              {deciding === "reject" ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{action.reason}</p>

      {facts.length > 0 && (
        // One rule above the whole block. A border on every cell left half-width hairlines
        // dangling wherever the last row had a single fact.
        <dl className="mt-3 grid gap-x-8 gap-y-1.5 border-t pt-3 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="flex items-baseline gap-2 text-sm">
              {/* Narrower on a phone: a fixed 128px label column left the value with under 300px
                  and broke "$1,462.80 +20%" across a line. */}
              <dt className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:w-32">
                {f.label}
              </dt>
              <dd className="font-mono tabular-nums">
                <span className={cn(f.to && "text-muted-foreground line-through decoration-1")}>
                  {f.from}
                </span>
                {f.to && (
                  <>
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    <span className="font-semibold text-primary">{f.to}</span>
                    {f.note && (
                      <span className="ml-1.5 text-xs text-muted-foreground">{f.note}</span>
                    )}
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
