import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@growthos/ui/components/button";

const TIERS = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    tagline: "Get the loop running on one brand.",
    features: ["1 workspace", "All three channels", "Core insight loop", "Email support"],
    featured: false,
    cta: "Start free",
  },
  {
    name: "Growth",
    price: "$99",
    period: "/ month",
    tagline: "For teams scaling paid and organic together.",
    features: [
      "5 workspaces",
      "Automated 4×/day scans",
      "Creative fatigue alerts",
      "Blended MER dashboard",
      "Priority support",
    ],
    featured: true,
    cta: "Start free trial",
  },
  {
    name: "Agency",
    price: "Custom",
    period: "",
    tagline: "For agencies running many clients.",
    features: ["Unlimited workspaces", "White-label reports", "Team roles", "Dedicated success"],
    featured: false,
    cta: "Talk to us",
  },
];

export function PricingTeaser() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Pricing
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Start free. Upgrade when it pays for itself.
        </h2>
      </div>

      <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={
              tier.featured
                ? "relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lg lg:-mt-4 lg:pb-10"
                : "rounded-2xl border bg-card p-8 shadow-sm"
            }
          >
            {tier.featured && (
              <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Most popular
              </span>
            )}
            <h3 className="font-display text-lg font-semibold">{tier.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
            <p className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold tracking-tight">
                {tier.price}
              </span>
              <span className="text-sm text-muted-foreground">{tier.period}</span>
            </p>
            <Button
              asChild
              className="mt-6 w-full"
              variant={tier.featured ? "default" : "outline"}
            >
              <Link href="/sign-up">{tier.cta}</Link>
            </Button>
            <ul className="mt-8 space-y-3 text-sm">
              {tier.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Placeholder pricing — final plans to be confirmed.
      </p>
    </section>
  );
}
