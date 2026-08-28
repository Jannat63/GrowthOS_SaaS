"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { PLAN_LIMITS, type Plan, type CountedMetric, type BooleanFeature } from "@growthos/types";
import { useSubscription, useUsage, useCheckout, usePortal } from "@/lib/hooks/useBilling";
import { trackEvent } from "@/lib/analytics";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";

const METRIC_LABEL: Record<CountedMetric, string> = {
  recommendations_generated: "Recommendations this week",
  ai_creatives_generated: "AI creatives this month",
};

const FEATURE_LABEL: Record<BooleanFeature, string> = {
  whiteLabel: "White-label branding",
  geoTracking: "GEO / AI-citation tracking",
  apiAccess: "API access",
};

const STATUS_VARIANT: Record<string, "default" | "muted" | "outline"> = {
  active: "default",
  trialing: "muted",
  past_due: "outline",
  canceled: "outline",
};

const PLAN_PRICE: Record<Plan, string> = {
  starter: "$79/mo",
  growth: "$199/mo",
  scale: "$399/mo",
};

const PLAN_BLURB: Record<Plan, string[]> = {
  starter: ["1 workspace", "500 tracked keywords", "5 recommendations/week"],
  growth: ["5 workspaces", "2,500 tracked keywords", "Unlimited recommendations", "GEO tracking + white-label"],
  scale: ["Unlimited workspaces", "10,000 tracked keywords", "Unlimited everything", "API access"],
};

/**
 * Cheapest to dearest. Used only to tell an upgrade from a downgrade — both offered a button
 * reading "Switch plan", so moving *down* a tier and losing white-label, GEO tracking or API access
 * looked exactly like moving up one. The direction of a plan change is the whole decision.
 */
const PLAN_ORDER: Plan[] = ["starter", "growth", "scale"];

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
}

export function BillingSection({
  workspaceId,
  isAdmin,
}: {
  workspaceId: string | null;
  isAdmin: boolean;
}) {
  const { data: subscription } = useSubscription(workspaceId);
  const { data: usage } = useUsage(workspaceId);
  const checkout = useCheckout(workspaceId);
  const portal = usePortal(workspaceId);
  const sub = subscription?.data;
  const trialDays = sub?.status === "trialing" ? daysLeft(sub.trialEndsAt) : null;

  // Stripe redirects here with ?checkout=success after a completed purchase (see billing.ts
  // success_url) — the only reliable client-side signal for a completed checkout, since the
  // actual plan sync happens server-side via webhook with no browser present. Strip the param
  // after firing so a page refresh doesn't double-count it.
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      trackEvent("checkout_completed");
      // Back to the pane the purchase came from. Stripe's success_url returns here with the query
      // param, and dropping the reader at the top of an eight-pane settings page with no sign of
      // what just happened was the old behaviour.
      router.replace("/settings?tab=billing");
    }
  }, [searchParams, router]);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display flex-1 text-lg font-semibold tracking-tight">Billing</h2>
        {subscription && <DataSourceBadge source={subscription.source} />}
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            disabled={portal.isPending}
            onClick={() => portal.mutate()}
          >
            {portal.isPending ? "Redirecting…" : "Manage billing"}
          </Button>
        )}
      </div>

      {!sub ? (
        <Skeleton className="mt-4 h-48 w-full" />
      ) : (
        <div className="mt-4 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="muted" className="capitalize">
              {sub.plan} plan
            </Badge>
            <Badge variant={STATUS_VARIANT[sub.status] ?? "outline"} className="capitalize">
              {sub.status.replace("_", " ")}
            </Badge>
            {trialDays !== null && (
              <span className="text-sm text-muted-foreground">
                {trialDays > 0 ? `${trialDays} day${trialDays === 1 ? "" : "s"} left in trial` : "Trial ends today"}
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {(Object.keys(PLAN_LIMITS) as Plan[]).map((plan) => {
              const isCurrent = plan === sub.plan;
              return (
                <div key={plan} className="flex flex-col rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-semibold capitalize">{plan}</span>
                    <span className="text-sm text-muted-foreground">{PLAN_PRICE[plan]}</span>
                  </div>
                  <ul className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
                    {PLAN_BLURB[plan].map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  {isAdmin && (
                    <Button
                      className="mt-4"
                      variant={
                        isCurrent || PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(sub.plan)
                          ? "outline"
                          : "default"
                      }
                      disabled={isCurrent || checkout.isPending}
                      onClick={() => checkout.mutate(plan)}
                    >
                      {isCurrent
                        ? "Current plan"
                        : checkout.isPending && checkout.variables === plan
                          ? "Redirecting…"
                          : PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(sub.plan)
                            ? "Upgrade"
                            : "Downgrade"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {usage?.data && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                {usage.data.metrics.map(({ metric, used, limit }) => {
                  const pct = limit === null ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
                  const atLimit = limit !== null && used >= limit;
                  return (
                    <div key={metric}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{METRIC_LABEL[metric]}</span>
                        <span className={atLimit ? "text-destructive" : "text-muted-foreground"}>
                          {used} / {limit === null ? "∞" : limit}
                        </span>
                      </div>
                      {limit !== null && (
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${atLimit ? "bg-destructive" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <ul className="space-y-1.5 text-xs">
                {usage.data.features.map(({ feature, enabled }) => (
                  <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                    />
                    {FEATURE_LABEL[feature]}
                    {!enabled && <span className="text-muted-foreground/70">— Growth+</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {checkout.isError && (
            <p className="text-sm text-destructive">
              {checkout.error instanceof Error
                ? checkout.error.message
                : "Could not start checkout. Try again in a moment."}
            </p>
          )}
          {portal.isError && (
            <p className="text-sm text-destructive">
              {portal.error instanceof Error
                ? portal.error.message
                : "Could not open the billing portal. Try again in a moment."}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
