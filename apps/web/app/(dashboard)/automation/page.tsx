"use client";
import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useAutomation, useSchedulerRuns } from "@/lib/hooks/useAutomation";
import {
  useActionDecision,
  useAutomationQueue,
  useAutomationRules,
  useRunAutomationPlan,
  useUpdateAutomationRule,
} from "@/lib/hooks/useAutomationQueue";
import { AuthorityStrip } from "@/components/automation/AuthorityStrip";
import { ActivityLedger } from "@/components/automation/ActivityLedger";
import { ProposalCard } from "@/components/automation/ProposalCard";
import { RuleCard } from "@/components/automation/RuleCard";
import { ACTIONS, ACTION_BY_KEY, type RuleState } from "@/components/automation/rules";

const LEDGER_LIMIT = 12;

/**
 * Automation — the standing orders you have given the platform, and what it did with them.
 *
 * The page is ordered by obligation. Proposals have a deadline, so when any exist they come first;
 * with an empty queue there is nothing to decide and the page opens instead on the question an
 * operator actually arrives with — *how much authority does this thing have right now?* That
 * question had no answer anywhere on the previous version, which opened on a 200px panel whose
 * entire content was the number 0.
 *
 * One accent rule, as elsewhere in the app: **ember means live authority or a live obligation**
 * (a rule that asks first, a proposal awaiting you), **gold means it acts unattended**, and
 * everything idle stays graphite. So the amount of colour on screen is a direct read on how much
 * the platform is currently allowed to do on its own.
 */
export default function AutomationPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const memberships = useMemo(() => me?.data.memberships ?? [], [me]);
  const workspaceId = activeId ?? memberships[0]?.workspaceId ?? null;
  const membership = memberships.find((m) => m.workspaceId === workspaceId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  const { data: pending, isLoading: pendingLoading } = useAutomationQueue(workspaceId, "proposed");
  const { data: history } = useAutomationQueue(workspaceId);
  const { data: rules, isLoading: rulesLoading } = useAutomationRules(workspaceId);
  const { data: automation } = useAutomation(workspaceId);
  const { data: runs } = useSchedulerRuns(workspaceId);

  const { approve, reject } = useActionDecision(workspaceId);
  const updateRule = useUpdateAutomationRule(workspaceId);
  const runPlan = useRunAutomationPlan(workspaceId);

  const proposals = pending?.data ?? [];
  const decided = (history?.data ?? []).filter((a) => a.status !== "proposed");
  const ruleByType = useMemo(
    () => new Map((rules?.data ?? []).map((r) => [r.actionType, r])),
    [rules],
  );

  /**
   * When this workspace was last planned.
   *
   * A scheduler run is a global tick, but `details.refreshed` names the workspaces that tick
   * actually touched — so the most recent run containing this workspace is the honest answer, and
   * the interval between ticks is not. Non-admins get 403 on the runs endpoint and fall back to an
   * empty list, in which case the strip simply omits the timing rather than guessing at it.
   */
  const lastCheckedAt = useMemo(() => {
    if (!workspaceId) return null;
    const hit = (runs?.data ?? []).find((r) => r.details?.refreshed?.includes(workspaceId));
    return hit?.startedAt ?? null;
  }, [runs, workspaceId]);

  function onRuleChange(actionType: (typeof ACTIONS)[number]["key"], next: RuleState) {
    const label = ACTION_BY_KEY.get(actionType)!.label;
    updateRule.mutate(
      {
        actionType,
        enabled: next !== "off",
        mode: next === "auto" ? "auto" : "suggest",
      },
      {
        onSuccess: () =>
          toast.success(
            next === "off"
              ? `${label} is off.`
              : next === "auto"
                ? `${label} will now act without asking.`
                : `${label} will queue proposals for your approval.`,
          ),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that rule."),
      },
    );
  }

  function onCheckNow() {
    runPlan.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(
          r.proposed === 0
            ? "Checked. Nothing met the conditions of your standing orders."
            : `Checked. ${r.proposed} proposal${r.proposed === 1 ? "" : "s"}${
                r.autoExecuted > 0 ? `, ${r.autoExecuted} run automatically` : ""
              }.`,
        ),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not run the check."),
    });
  }

  const loading = pendingLoading || rulesLoading;

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Automation</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          The standing orders you have given the platform, and what it did with them.
        </p>

        {/* Was a full-width alert card competing with the content for attention, and it named the
            wrong cause: it blamed a missing connection, but `resolveAdapter` never consults one —
            there is no registered platform adapter yet (P4.3b), so campaign actions are recorded
            whether or not an account is connected. Stating the real reason matters, because the old
            wording implied that connecting Google Ads would make this go live. It would not. */}
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            <span className="font-medium text-foreground">Dry run.</span> GrowthOS has no write
            integration with Google Ads or Meta yet, so approving a campaign action records exactly
            what would have been sent and changes nothing in your account. Content briefs are the
            exception — those are created for real.
          </span>
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {proposals.length > 0 && (
            <Card className="p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                    Waiting on you
                  </p>
                  <h2 className="mt-1.5 font-display text-lg font-semibold tracking-tight">
                    {proposals.length} proposal{proposals.length === 1 ? "" : "s"} to decide
                  </h2>
                </div>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Approving needs an admin. You can see everything here.
                  </p>
                )}
              </div>
              <ul className="mt-4 space-y-3">
                {proposals.map((action) => (
                  <ProposalCard
                    key={action.id}
                    action={action}
                    canDecide={isAdmin}
                    // Per row, not per page: a single global `busy` flag disabled every button in
                    // the queue while one request was in flight, and named none of them.
                    deciding={
                      approve.isPending && approve.variables === action.id
                        ? "approve"
                        : reject.isPending && reject.variables === action.id
                          ? "reject"
                          : null
                    }
                    onApprove={() =>
                      approve.mutate(action.id, {
                        onSuccess: () => toast.success("Approved and recorded."),
                        onError: (e) =>
                          toast.error(e instanceof Error ? e.message : "Could not approve that."),
                      })
                    }
                    onReject={() =>
                      reject.mutate(action.id, {
                        onSuccess: () => toast.success("Rejected."),
                        onError: (e) =>
                          toast.error(e instanceof Error ? e.message : "Could not reject that."),
                      })
                    }
                  />
                ))}
              </ul>
            </Card>
          )}

          <AuthorityStrip
            rules={ruleByType}
            pendingCount={proposals.length}
            scheduled={automation?.data.enabled ?? true}
            cadenceMs={automation?.data.cadenceMs ?? 7 * 24 * 60 * 60 * 1000}
            lastCheckedAt={lastCheckedAt}
            canRun={isAdmin}
            onRun={onCheckNow}
            running={runPlan.isPending}
          />

          <Card className="p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              The dial
            </p>
            <h2 className="mt-1.5 font-display text-lg font-semibold tracking-tight">
              What it may do
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Each order is off until you switch it on. <span className="text-foreground">Ask first</span>{" "}
              queues a proposal for you; <span className="text-foreground">act alone</span> runs it
              without asking, within its caps.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {ACTIONS.map((a) => (
                <RuleCard
                  key={a.key}
                  actionType={a.key}
                  rule={ruleByType.get(a.key)}
                  canEdit={isAdmin}
                  pending={updateRule.isPending && updateRule.variables?.actionType === a.key}
                  onChange={(next) => onRuleChange(a.key, next)}
                />
              ))}
            </div>
          </Card>

          <ActivityLedger actions={decided.slice(0, LEDGER_LIMIT)} total={decided.length} />
        </>
      )}
    </div>
  );
}
