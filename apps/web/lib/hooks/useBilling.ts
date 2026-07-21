"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Plan, Subscription } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

const MOCK_SUBSCRIPTION: Subscription = {
  plan: "starter",
  status: "trialing",
  trialEndsAt: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAt: null,
};

// Current plan/status for the workspace. Mock fallback mirrors what a fresh, unconfigured
// workspace looks like server-side (see billing.ts getCurrentSubscription) so the Settings page
// renders sensibly even when the API is unreachable.
export function useSubscription(workspaceId: string | null | undefined) {
  return useQuery<{ data: Subscription; source: "live" | "mock" }>({
    queryKey: ["billing", "subscription", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<Subscription>(`/workspaces/${workspaceId}/billing/subscription`),
        () => MOCK_SUBSCRIPTION
      ),
  });
}

// Starts a Stripe Checkout session and sends the browser there. No mock fallback — a plan
// purchase is a real-money action, so this surfaces the error instead of pretending to succeed.
export function useCheckout(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Plan) => {
      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>(
        `/workspaces/${workspaceId}/billing/checkout`,
        { plan }
      );
      return checkoutUrl;
    },
    onSuccess: (checkoutUrl) => {
      qc.invalidateQueries({ queryKey: ["billing", "subscription", workspaceId] });
      window.location.href = checkoutUrl;
    },
  });
}
