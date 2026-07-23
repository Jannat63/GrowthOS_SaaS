"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Plan, Subscription, UsageSummary } from "@growthos/types";
import { api } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics";
import { liveOrMock } from "./liveOrMock";

const MOCK_SUBSCRIPTION: Subscription = {
  plan: "starter",
  status: "trialing",
  trialEndsAt: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAt: null,
};

const MOCK_USAGE: UsageSummary = {
  plan: "starter",
  metrics: [
    { metric: "recommendations_generated", used: 0, limit: 5 },
    { metric: "ai_creatives_generated", used: 0, limit: 10 },
  ],
  features: [
    { feature: "whiteLabel", enabled: false },
    { feature: "geoTracking", enabled: false },
    { feature: "apiAccess", enabled: false },
  ],
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

// Usage vs. plan limits (M5 P5.2) — powers the usage bars + upgrade prompts.
export function useUsage(workspaceId: string | null | undefined) {
  return useQuery<{ data: UsageSummary; source: "live" | "mock" }>({
    queryKey: ["billing", "usage", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<UsageSummary>(`/workspaces/${workspaceId}/billing/usage`),
        () => MOCK_USAGE
      ),
  });
}

// Starts a Stripe Checkout session and sends the browser there. No mock fallback — a plan
// purchase is a real-money action, so this surfaces the error instead of pretending to succeed.
export function useCheckout(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Plan) => {
      trackEvent("checkout_started", { plan });
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

// Opens the Stripe Customer Portal (manage payment method, invoices, cancel). No mock fallback —
// same reasoning as useCheckout.
export function usePortal(workspaceId: string | null | undefined) {
  return useMutation({
    mutationFn: async () => {
      const { portalUrl } = await api.post<{ portalUrl: string }>(
        `/workspaces/${workspaceId}/billing/portal`,
        {}
      );
      return portalUrl;
    },
    onSuccess: (portalUrl) => {
      window.location.href = portalUrl;
    },
  });
}
