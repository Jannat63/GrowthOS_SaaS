import Link from "next/link";
import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { Button } from "@growthos/ui/components/button";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Starter, Growth, and Scale plans for GrowthOS — one loop across SEO, Google Ads, and Meta Ads. 14-day free trial on Growth, no credit card required.",
};
import { PLAN_LIMITS, type Plan } from "@growthos/types";

// Every number on this page reads from @growthos/types PLAN_LIMITS — the same source
// apps/api/src/plan-limits.ts enforces server-side. Nothing here is independently maintained,
// so this page can't drift out of sync with what checkout actually charges or what the app
// actually allows.

const PLANS: Plan[] = ["starter", "growth", "scale"];

const PLAN_PRICE: Record<Plan, string> = { starter: "$79", growth: "$199", scale: "$399" };
const PLAN_NAME: Record<Plan, string> = { starter: "Starter", growth: "Growth", scale: "Scale" };
const PLAN_TAGLINE: Record<Plan, string> = {
  starter: "One brand, one operator.",
  growth: "Paid and organic, scaling together.",
  scale: "Agencies and multi-brand operators.",
};
const PLAN_SUPPORT: Record<Plan, string> = {
  starter: "Email",
  growth: "Priority email + chat",
  scale: "Dedicated + Slack",
};

function fmt(n: number): string {
  return n === Infinity ? "Unlimited" : n.toLocaleString();
}

function money(n: number): string {
  return n === Infinity ? "Unlimited" : `Up to $${n.toLocaleString()}`;
}

type Row = { label: string; values: (plan: Plan) => string | boolean };

const ROWS: Row[] = [
  { label: "Workspaces / ad accounts", values: (p) => `${fmt(PLAN_LIMITS[p].workspaces)} each` },
  { label: "Keywords tracked", values: (p) => fmt(PLAN_LIMITS[p].trackedKeywords) },
  { label: "Monthly ad spend", values: (p) => money(PLAN_LIMITS[p].adSpendLimit) },
  {
    label: "Intelligence recommendations",
    values: (p) =>
      PLAN_LIMITS[p].recommendationsPerWeek === Infinity
        ? p === "scale"
          ? "Unlimited + priority"
          : "Unlimited"
        : `${fmt(PLAN_LIMITS[p].recommendationsPerWeek)}/week`,
  },
  { label: "Generated creatives", values: (p) => `${fmt(PLAN_LIMITS[p].aiCreativesPerMonth)}/month` },
  // NOTE: PLAN_LIMITS[p].geoTracking is deliberately not shown. The entitlement is real and
  // billing enforces it, but AI-citation tracking itself is deferred (M4 P4.4b, pending paid
  // API access) — listing it here would advertise a feature that does not exist yet. Restore
  // this row when P4.4b ships. Do not "fix" it by editing PLAN_LIMITS: that is the contract.
  { label: "White-label reports", values: (p) => PLAN_LIMITS[p].whiteLabel },
  {
    label: "Cross-channel attribution",
    values: (p) =>
      ({ mer_only: "Blended MER only", full: "Full model", full_custom: "Full + custom" })[
        PLAN_LIMITS[p].crossChannelAttribution
      ],
  },
  { label: "Team members", values: (p) => fmt(PLAN_LIMITS[p].teamMembers) },
  { label: "API access", values: (p) => PLAN_LIMITS[p].apiAccess },
  { label: "Support", values: (p) => PLAN_SUPPORT[p] },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-4 w-4 text-success" />
    ) : (
      <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
    );
  }
  return <span>{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-[11px] tracking-[0.18em] text-primary">PRICING</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Three channels, three ways to run them.
        </h1>
        <p className="mt-4 text-muted-foreground">
          14-day free trial on the Growth tier, no credit card required. Annual billing gets a 20% discount.
        </p>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const featured = plan === "growth";
          return (
            <div
              key={plan}
              className={
                featured
                  ? "relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lg"
                  : "rounded-2xl border bg-card p-8 shadow-sm"
              }
            >
              {featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h2 className="font-display text-lg font-semibold tracking-tight">{PLAN_NAME[plan]}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{PLAN_TAGLINE[plan]}</p>
              <p className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold tracking-tight">{PLAN_PRICE[plan]}</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </p>
              <Button asChild className="mt-6 w-full" variant={featured ? "default" : "outline"}>
                <Link href="/sign-up">Start free trial</Link>
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-16 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-4 text-left font-medium text-muted-foreground">Feature</th>
              {PLANS.map((plan) => (
                <th key={plan} className="py-4 text-center font-display font-semibold tracking-tight">
                  {PLAN_NAME[plan]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-border/60">
                <td className="py-4 pr-4 text-muted-foreground">{row.label}</td>
                {PLANS.map((plan) => (
                  <td key={plan} className="py-4 text-center">
                    <Cell value={row.values(plan)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Running an agency with many brands, or not sure which tier fits?{" "}
        <Link href="/faq" className="text-primary underline underline-offset-4">
          Read the FAQ
        </Link>
        .
      </p>
    </div>
  );
}
