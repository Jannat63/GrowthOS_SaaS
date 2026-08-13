import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { PLAN_LIMITS, type Plan } from "@growthos/types";

// Pricing shown here is derived from @growthos/types PLAN_LIMITS — the same source
// apps/api/src/plan-limits.ts enforces and BillingSection.tsx displays post-signup, so the
// number a visitor sees here always matches what Stripe actually charges.
const PLAN_PRICE: Record<Plan, string> = { starter: "$79", growth: "$199", scale: "$399" };
const PLAN_TAGLINE: Record<Plan, string> = {
  starter: "Get the loop running on one brand.",
  growth: "For teams scaling paid and organic together.",
  scale: "For agencies and multi-brand operators.",
};
const PLAN_CTA: Record<Plan, string> = {
  starter: "Start free trial",
  growth: "Start free trial",
  scale: "Start free trial",
};

function planFeatures(plan: Plan): string[] {
  const l = PLAN_LIMITS[plan];
  const num = (n: number) => (n === Infinity ? "Unlimited" : n.toLocaleString());
  return [
    `${num(l.workspaces)} workspace${l.workspaces === 1 ? "" : "s"}`,
    `${num(l.trackedKeywords)} keywords tracked`,
    `${l.recommendationsPerWeek === Infinity ? "Unlimited" : num(l.recommendationsPerWeek) + "/week"} recommendations`,
    `${num(l.aiCreativesPerMonth)} AI creatives/mo`,
    ...(l.geoTracking ? ["GEO / AI-citation tracking"] : []),
    ...(l.whiteLabel ? ["White-label reports"] : []),
    ...(l.apiAccess ? ["Full API access"] : []),
  ];
}

const PLANS: Plan[] = ["starter", "growth", "scale"];

export function PricingTeaser() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Pricing
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Start with a 14-day free trial. No credit card.
        </h2>
      </div>

      <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const featured = plan === "growth";
          return (
            <div
              key={plan}
              className={
                featured
                  ? "relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lg lg:-mt-4 lg:pb-10"
                  : "rounded-2xl border bg-card p-8 shadow-sm"
              }
            >
              {featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-lg font-semibold capitalize">{plan}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{PLAN_TAGLINE[plan]}</p>
              <p className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold tracking-tight">
                  {PLAN_PRICE[plan]}
                </span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </p>
              <Button
                asChild
                className="mt-6 w-full"
                variant={featured ? "default" : "outline"}
              >
                <Link href="/sign-up">{PLAN_CTA[plan]}</Link>
              </Button>
              <ul className="mt-8 space-y-3 text-sm">
                {planFeatures(plan).map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/pricing" className="underline underline-offset-4 hover:text-foreground">
          See the full plan comparison
        </Link>
        {" · "}Annual billing: 20% discount.
      </p>
    </section>
  );
}
