"use client";
import { CreditCard } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { PLAN_LIMITS, type Plan } from "@growthos/types";
import { useSubscription, useCheckout } from "@/lib/hooks/useBilling";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";

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
  const checkout = useCheckout(workspaceId);
  const sub = subscription?.data;
  const trialDays = sub?.status === "trialing" ? daysLeft(sub.trialEndsAt) : null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Billing</h2>
        {subscription && <DataSourceBadge source={subscription.source} />}
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
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || checkout.isPending}
                      onClick={() => checkout.mutate(plan)}
                    >
                      {isCurrent
                        ? "Current plan"
                        : checkout.isPending && checkout.variables === plan
                          ? "Redirecting…"
                          : "Switch plan"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {checkout.isError && (
            <p className="text-sm text-destructive">
              {checkout.error instanceof Error
                ? checkout.error.message
                : "Could not start checkout. Try again in a moment."}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
