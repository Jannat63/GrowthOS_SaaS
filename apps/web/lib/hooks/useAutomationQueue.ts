"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type AutomationActionType =
  | "pause_campaign"
  | "adjust_budget"
  | "refresh_creative"
  | "queue_content";

export type AutomationActionStatus =
  | "proposed"
  | "approved"
  | "executed"
  | "failed"
  | "rejected"
  | "expired";

export interface AutomationActionRecord {
  id: string;
  actionType: AutomationActionType;
  status: AutomationActionStatus;
  target: { platform: string; campaignName?: string; creativeName?: string; keyword?: string };
  payload: Record<string, unknown>;
  previousValue: Record<string, unknown> | null;
  reason: string;
  approvedBy: string | null;
  executedAt: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string | null;
}

export interface AutomationRuleRecord {
  id: string;
  actionType: AutomationActionType;
  enabled: boolean;
  mode: "suggest" | "auto";
  threshold: Record<string, number> | null;
  caps: Record<string, number> | null;
}

/**
 * No live/mock fallback anywhere in this file — the same reasoning as useApiKeys and useBilling.
 * These endpoints decide whether the platform may change a customer's campaigns; showing invented
 * proposals, or implying an approval succeeded when the request never landed, would be worse than
 * showing an error.
 */
export function useAutomationQueue(
  workspaceId: string | null | undefined,
  status?: AutomationActionStatus
) {
  const query = status ? `&status=${status}` : "";
  return useQuery<{ data: AutomationActionRecord[]; total: number }>({
    queryKey: ["automation-actions", workspaceId, status ?? "all"],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      api.get(`/workspaces/${workspaceId}/automation/actions?limit=100${query}`),
  });
}

export function useAutomationRules(workspaceId: string | null | undefined) {
  return useQuery<{ data: AutomationRuleRecord[]; total: number }>({
    queryKey: ["automation-rules", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => api.get(`/workspaces/${workspaceId}/automation/rules`),
  });
}

/** Approving runs the action, so both the queue and anything it may have produced are invalidated. */
export function useActionDecision(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["automation-actions", workspaceId] });
    qc.invalidateQueries({ queryKey: ["content-briefs", workspaceId] });
  };

  const approve = useMutation({
    mutationFn: (actionId: string) =>
      api.post(`/workspaces/${workspaceId}/automation/actions/${actionId}/approve`, {}),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (actionId: string) =>
      api.post(`/workspaces/${workspaceId}/automation/actions/${actionId}/reject`, {}),
    onSuccess: invalidate,
  });

  return { approve, reject };
}

export function useUpdateAutomationRule(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: Partial<AutomationRuleRecord> & { actionType: AutomationActionType }) =>
      api.patch(`/workspaces/${workspaceId}/automation/rules`, rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules", workspaceId] }),
  });
}

/**
 * Run the planner now rather than waiting for this workspace's next scheduled tick.
 *
 * The cron fires hourly but only plans a workspace whose last run is older than its own cadence —
 * a week by default — so without this the only way to fill the queue was to wait an amount of time
 * the page never disclosed. Pressing it twice is safe: the planner skips targets that already have
 * an open action, so a second run proposes nothing new instead of duplicating the first.
 */
export function useRunAutomationPlan(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<{ proposed: number; autoExecuted: number; failed: number }>({
    mutationFn: () => api.post(`/workspaces/${workspaceId}/automation/plan`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-actions", workspaceId] });
      qc.invalidateQueries({ queryKey: ["scheduler-runs", workspaceId] });
    },
  });
}
