"use client";
import { channelLabel } from "@growthos/logic";
import { Badge } from "@growthos/ui/components/badge";
import { Card } from "@growthos/ui/components/card";
import type { AutomationActionRecord, AutomationActionStatus } from "@/lib/hooks/useAutomationQueue";
import { ACTION_BY_KEY, relativeTime, subjectOf } from "./rules";

/**
 * What automation has actually done — always on screen, including when it has done nothing.
 *
 * The old card rendered only `decided.length > 0`, so the ledger a person needs in order to trust a
 * subsystem that can spend money was invisible in exactly the state where trust has not been earned
 * yet. It also showed a status pill next to a truncated reason and nothing else: not which rule
 * fired, not what it touched, not when. An audit trail that cannot answer "when" is not one.
 */

const STATUS: Record<AutomationActionStatus, { label: string; variant: "success" | "destructive" | "muted" | "warning" | "outline" | "default" }> = {
  executed: { label: "Done", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  rejected: { label: "Rejected", variant: "muted" },
  expired: { label: "Expired", variant: "outline" },
  // Approved but never executed means a run died mid-batch or a policy check refused it afterwards.
  // It is a real state the executor deliberately leaves recoverable, so it gets a real label.
  approved: { label: "Approved, not run", variant: "warning" },
  proposed: { label: "Waiting", variant: "default" },
};

export function ActivityLedger({
  actions,
  total,
}: {
  actions: AutomationActionRecord[];
  total: number;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Ledger
          </p>
          <h2 className="mt-1.5 font-display text-lg font-semibold tracking-tight">
            What it has done
          </h2>
        </div>
        {actions.length > 0 && (
          <p className="font-mono text-[11px] text-muted-foreground">
            {actions.length === total
              ? `${total} decided`
              : `${actions.length} most recent of ${total} decided`}
          </p>
        )}
      </div>

      {actions.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nothing decided yet. Every proposal you approve or reject is recorded here — what it was,
          what it touched, and how it ended.
        </p>
      ) : (
        <ul className="mt-4 divide-y">
          {actions.map((a) => {
            const meta = ACTION_BY_KEY.get(a.actionType);
            const status = STATUS[a.status] ?? STATUS.proposed;
            const at = a.executedAt ?? a.createdAt;
            return (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
                <Badge variant={status.variant} className="shrink-0">
                  {status.label}
                </Badge>
                <span className="text-sm font-medium">{meta?.label ?? a.actionType}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {channelLabel(a.target.platform)} · {subjectOf(a)}
                </span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                  {at ? relativeTime(at) : ""}
                </span>
                <p className="w-full text-sm text-muted-foreground">{a.reason}</p>
                {a.error && (
                  <p className="w-full font-mono text-xs text-destructive">{a.error}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
