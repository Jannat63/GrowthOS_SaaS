"use client";
import { useMemo, useState } from "react";
import { buildFullFunnelPlan, type AccountMaturity, type AudienceTemperature } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { LockedField } from "@/components/LockedField";
import { Label } from "@growthos/ui/components/label";
import { cn } from "@/lib/utils/cn";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * Audience temperature, drawn as heat.
 *
 * The three stages were `bg-primary`, `bg-success` and `bg-ink`: the action colour a workspace
 * repaints for white-labelling, the colour that means "healthy", and the near-black rail surface.
 * None says anything about a funnel stage, and two were actively wrong — `--success` is
 * byte-identical to `--channel-seo` in dark, so the middle of a *Meta* funnel was drawn in the SEO
 * channel's colour, and `--ink` is #05080b against a #141b24 card, which is a dot you cannot see.
 *
 * Cold → Warm → Hot is an ORDERED scale, not three categories, so it gets one hue at three
 * strengths rather than three hues. The hue is the brand's, the direction is the funnel's own
 * vocabulary, and as a ramp it stays coherent under any `--primary` a tenant sets.
 */
const HEAT: Record<AudienceTemperature, string> = {
  Cold: "bg-primary/30",
  Warm: "bg-primary/60",
  Hot: "bg-primary",
};

/**
 * Who each temperature actually is, in the reader's terms.
 *
 * TOFU / MOFU / BOFU are trade jargon that the page previously offered with no gloss at all — three
 * acronyms, a bar and a budget. The acronym is kept for anyone who works in these terms daily; this
 * is what it means for everyone else. View copy, so it lives here rather than in the engine, the
 * same way `PLAY_BLURB` does for the creative queue.
 */
const WHO: Record<AudienceTemperature, string> = {
  Cold: "Have never heard of you",
  Warm: "Know you, haven't bought",
  Hot: "Came close to buying",
};

const MATURITY: { value: AccountMaturity; label: string; hint: string }[] = [
  {
    value: "new",
    label: "New account",
    hint: "There is no warm or hot audience to retarget yet, so most of the budget has to go to finding people.",
  },
  {
    value: "established",
    label: "Established",
    hint: "You already have visitors and cart abandoners to retarget, which is cheaper than finding new people.",
  },
];

/**
 * Splits a monthly budget across audience temperatures — the `@growthos/logic` full-funnel split.
 * Entirely client-side: no backend call and no generation quota.
 */
export function FunnelPlanner({
  product,
  monthlySpend,
}: {
  product: string;
  /**
   * What the account is actually spending a month, from the campaign window above.
   *
   * The field used to default to a hardcoded $5,000 while the real figure sat in a tile directly
   * above it. Starting from the account's own run-rate makes the split answer "how should THIS
   * budget be arranged" rather than a hypothetical. Typing overrides it, and the typed value stays.
   */
  monthlySpend: number | null;
}) {
  const [typed, setTyped] = useState<number | null>(null);
  const [maturity, setMaturity] = useState<AccountMaturity>("new");
  const suggested = monthlySpend && monthlySpend > 0 ? Math.round(monthlySpend) : 5000;
  const budget = typed ?? suggested;

  const plan = useMemo(
    () => buildFullFunnelPlan(budget || 0, product.trim() || "your product", maturity),
    [budget, product, maturity]
  );
  const total = plan.reduce((s, p) => s + p.budget, 0) || 1;
  const active = MATURITY.find((m) => m.value === maturity)!;

  return (
    <Card className="p-6">
      <h3 className="font-display text-base font-semibold tracking-tight">
        Split the budget by audience
      </h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Meta is bought by how well an audience already knows you, not by what they searched for.
        Each temperature needs its own budget, objective and targeting.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="grid w-full max-w-[19rem] gap-1.5">
          <Label htmlFor="funnel-budget">Monthly budget</Label>
          {/* The unit rides in the locked display (usd) rather than as an absolutely-positioned
              prefix, which would have doubled up with it. */}
          <LockedField
            id="funnel-budget"
            label="monthly budget"
            type="number"
            value={budget}
            onChange={(v) => setTyped(Math.max(0, Number(v) || 0))}
            display={(v) => usd(Number(v))}
            inputProps={{ min: 0, className: "font-mono" }}
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Account age</span>
          <div className="flex flex-wrap gap-2">
            {MATURITY.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMaturity(m.value)}
                aria-pressed={maturity === m.value}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  maturity === m.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-primary/10"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* One line under the controls rather than a caption per control, so the buttons keep their
          baseline against the field instead of being pushed down by text beside them. */}
      <p className="mt-2.5 max-w-2xl text-xs text-muted-foreground">
        {monthlySpend !== null && typed === null && <>Starting from your current Meta run-rate. </>}
        {active.hint}
      </p>

      {/*
        ONE stacked bar, not one bar per row.
        Each stage used to carry its own progress bar next to its own percentage — the same number
        drawn twice, three times over, and never showing the three against each other. What the
        reader needs from a split is the proportions, which is a single bar.
      */}
      <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        {plan.map((stage) => (
          <div
            key={stage.stage}
            className={cn("h-full", HEAT[stage.temperature])}
            style={{ width: `${(stage.budget / total) * 100}%` }}
          />
        ))}
      </div>

      <ul className="mt-4 divide-y rounded-lg border">
        {plan.map((stage) => (
          <li key={stage.stage} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
            <span aria-hidden className={cn("h-2.5 w-2.5 shrink-0 rounded-full", HEAT[stage.temperature])} />
            <span className="w-12 shrink-0 font-medium">{stage.temperature}</span>
            <span className="font-mono text-xs text-muted-foreground">{stage.stage}</span>

            <span className="ml-auto font-mono font-medium tabular-nums">{usd(stage.budget)}</span>
            <span className="w-10 shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground">
              {Math.round((stage.budget / total) * 100)}%
            </span>

            <p className="w-full pl-[1.375rem] text-sm text-muted-foreground">
              {WHO[stage.temperature]} · {stage.audience} · optimise for {stage.objective}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
