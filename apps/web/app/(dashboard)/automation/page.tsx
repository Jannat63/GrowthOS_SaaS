"use client";
import { Bot, Check, X, ShieldAlert, PauseCircle, TrendingUp, RefreshCw, FileText } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import {
  useAutomationQueue,
  useAutomationRules,
  useActionDecision,
  useUpdateAutomationRule,
  type AutomationActionRecord,
  type AutomationActionType,
} from "@/lib/hooks/useAutomationQueue";

/**
 * Automation (M4 · P4.3a) — the approval queue and the rules that feed it.
 *
 * The page leads with what is waiting for a decision, because that is the only part with a deadline.
 * Every proposal shows its reason and, for anything that overwrites existing state, what it would
 * overwrite — nobody should have to approve a change they cannot see the shape of.
 */

const ACTION_META: Record<AutomationActionType, { label: string; hint: string; icon: typeof Bot }> = {
  pause_campaign: {
    label: "Pause wasted campaigns",
    hint: "Pause campaigns spending without returning",
    icon: PauseCircle,
  },
  adjust_budget: {
    label: "Scale winning campaigns",
    hint: "Raise budget on high-ROAS campaigns",
    icon: TrendingUp,
  },
  refresh_creative: {
    label: "Refresh fatigued creatives",
    hint: "Flag creatives whose CTR has collapsed",
    icon: RefreshCw,
  },
  queue_content: {
    label: "Queue content from search terms",
    hint: "Turn converting paid terms into content briefs",
    icon: FileText,
  },
};

const STATUS_VARIANT: Record<string, "default" | "muted" | "outline"> = {
  proposed: "default",
  approved: "default",
  executed: "muted",
  rejected: "outline",
  failed: "outline",
  expired: "outline",
};

export default function AutomationPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const memberships = me?.data.memberships ?? [];
  const workspaceId = activeId ?? memberships[0]?.workspaceId ?? null;
  const membership = memberships.find((m) => m.workspaceId === workspaceId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  const { data: pending, isLoading: pendingLoading } = useAutomationQueue(workspaceId, "proposed");
  const { data: history } = useAutomationQueue(workspaceId);
  const { data: rules } = useAutomationRules(workspaceId);
  const { approve, reject } = useActionDecision(workspaceId);
  const updateRule = useUpdateAutomationRule(workspaceId);

  const proposals = pending?.data ?? [];
  const decided = (history?.data ?? []).filter((a) => a.status !== "proposed").slice(0, 10);
  const ruleByType = new Map((rules?.data ?? []).map((r) => [r.actionType, r]));
  const busy = approve.isPending || reject.isPending;

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Automation</h1>
        <p className="text-sm text-muted-foreground">
          What the platform proposes to do on its own — and what it has already done.
        </p>
      </div>

      {/* Until a platform connection exists, everything except content queueing is recorded rather
          than sent. Saying so plainly matters more than a tidy UI: an operator must never believe a
          campaign changed when it did not. */}
      <Card className="flex items-start gap-3 border-primary/30 bg-primary/5 p-4">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Dry run.</span> No advertising platform is
          connected with write access, so approving a campaign action records exactly what would have
          been sent without changing anything. Content briefs are the exception — those are created
          for real.
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight">Awaiting approval</h2>
          <Badge variant="muted">{proposals.length}</Badge>
        </div>

        <div className="mt-4">
          {pendingLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : proposals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing waiting. Proposals appear here as the hourly run finds them.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {proposals.map((action) => (
                <ProposalRow
                  key={action.id}
                  action={action}
                  isAdmin={isAdmin}
                  busy={busy}
                  onApprove={() => approve.mutate(action.id)}
                  onReject={() => reject.mutate(action.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">Rules</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Automation is off until you turn it on. <span className="font-medium">Suggest</span> queues
          proposals for approval; <span className="font-medium">auto</span> runs them within their caps.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.keys(ACTION_META) as AutomationActionType[]).map((actionType) => {
            const meta = ACTION_META[actionType];
            const rule = ruleByType.get(actionType);
            const Icon = meta.icon;
            return (
              <div key={actionType} className="flex items-start gap-3 rounded-lg border p-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.hint}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={rule?.enabled ? "default" : "outline"}>
                      {rule?.enabled ? rule.mode : "off"}
                    </Badge>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updateRule.isPending}
                        onClick={() =>
                          updateRule.mutate({
                            actionType,
                            enabled: !rule?.enabled,
                            mode: rule?.mode ?? "suggest",
                          })
                        }
                      >
                        {rule?.enabled ? "Turn off" : "Turn on"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {decided.length > 0 && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">Recent activity</h2>
          <ul className="mt-4 flex flex-col divide-y">
            {decided.map((action) => (
              <li key={action.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Badge variant={STATUS_VARIANT[action.status] ?? "outline"} className="capitalize">
                  {action.status}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{action.reason}</span>
                {action.error && (
                  <span className="shrink-0 text-xs text-destructive">{action.error}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ProposalRow({
  action,
  isAdmin,
  busy,
  onApprove,
  onReject,
}: {
  action: AutomationActionRecord;
  isAdmin: boolean;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const meta = ACTION_META[action.actionType];
  const subject =
    action.target.campaignName ?? action.target.creativeName ?? action.target.keyword ?? "—";

  return (
    <li className="flex flex-wrap items-start gap-3 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{meta?.label ?? action.actionType}</span>
          <Badge variant="outline">{subject}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{action.reason}</p>

        {/* What it would overwrite, shown next to what it would become. */}
        {action.previousValue && (
          <p className="mt-1.5 font-mono text-xs text-muted-foreground">
            {JSON.stringify(action.previousValue)}
            <span className="mx-1.5 text-foreground">→</span>
            {JSON.stringify(action.payload)}
          </p>
        )}
      </div>

      {isAdmin && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" disabled={busy} onClick={onApprove}>
            <Check className={cn("mr-1 h-3.5 w-3.5")} /> Approve
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>
            <X className="mr-1 h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}
    </li>
  );
}
