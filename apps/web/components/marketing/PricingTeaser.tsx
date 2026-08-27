import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { PLAN_LIMITS, type Plan } from "@growthos/types";
import { cn } from "@/lib/utils/cn";

// Pricing shown here is derived from @growthos/types PLAN_LIMITS — the same source
// apps/api/src/plan-limits.ts enforces and BillingSection.tsx displays post-signup, so the
// number a visitor sees here always matches what Stripe actually charges.
const PLAN_PRICE: Record<Plan, string> = { starter: "$79", growth: "$199", scale: "$399" };
const PLAN_NAME: Record<Plan, string> = { starter: "Starter", growth: "Growth", scale: "Scale" };
const PLAN_TAGLINE: Record<Plan, string> = {
  starter: "One brand, one operator.",
  growth: "Paid and organic, scaling together.",
  scale: "Agencies and multi-brand operators.",
};

function planFeatures(plan: Plan): string[] {
  const l = PLAN_LIMITS[plan];
  const num = (n: number) => (n === Infinity ? "Unlimited" : n.toLocaleString());
  return [
    `${num(l.workspaces)} workspace${l.workspaces === 1 ? "" : "s"}`,
    `${num(l.teamMembers)} team member${l.teamMembers === 1 ? "" : "s"}`,
    `${l.recommendationsPerWeek === Infinity ? "Unlimited" : num(l.recommendationsPerWeek) + "/week"} recommendations`,
    `${num(l.aiCreativesPerMonth)} generated creatives/mo`,
    l.crossChannelAttribution === "mer_only"
      ? "Blended MER"
      : "Full cross-channel attribution",
    // NOTE: l.geoTracking is deliberately not surfaced. It gates a billing entitlement that is
    // real, but AI-citation tracking itself is deferred (M4 P4.4b, pending paid API access) —
    // so advertising it here would be selling something that does not yet exist. Restore this
    // line when P4.4b ships. Do not "fix" it by editing PLAN_LIMITS: that is the billing contract.
    ...(l.whiteLabel ? ["White-label reports"] : []),
    ...(l.apiAccess ? ["Full API access"] : []),
  ];
}

const PLANS: Plan[] = ["starter", "growth", "scale"];

export function PricingTeaser() {
  return (
    // Plain background on purpose: WhoItsFor directly above is already a muted band, and two
    // adjacent bands of the same tone read as one long section rather than two.
    <section id="pricing">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] tracking-[0.18em] text-primary">PRICING</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Every plan starts with 14 days of Growth, free
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            No card to start. The trial runs on Growth-tier features so you can connect all three
            channels and watch a bridge fire before you decide.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const featured = plan === "growth";
            return (
              <div
                key={plan}
                className={cn(
                  "relative rounded-2xl bg-card p-8",
                  featured
                    ? "border-2 border-primary shadow-lg lg:-mt-4 lg:pb-10"
                    : "border shadow-xs"
                )}
              >
                {featured && (
                  <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 font-mono text-[10px] tracking-[0.12em] text-primary-foreground">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {PLAN_NAME[plan]}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{PLAN_TAGLINE[plan]}</p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-bold tracking-tight tabular">
                    {PLAN_PRICE[plan]}
                  </span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </p>
                <Button
                  asChild
                  className="mt-6 w-full"
                  variant={featured ? "default" : "outline"}
                >
                  <Link href="/sign-up">Start free trial</Link>
                </Button>
                <ul className="mt-8 space-y-3 text-sm">
                  {planFeatures(plan).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          <Link href="/pricing" className="text-primary underline underline-offset-4">
            See the full plan comparison
          </Link>
          {" · "}Annual billing saves 20%.
        </p>
      </div>
    </section>
  );
}
