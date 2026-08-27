"use client";
import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import {
  allocateBudget,
  calculateMinimumRoas,
  calculateTargetCpa,
  type BusinessStage,
} from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { cn } from "@/lib/utils/cn";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const STAGES: { value: BusinessStage; label: string }[] = [
  { value: "new", label: "New" },
  { value: "growth", label: "Growth" },
  { value: "scale", label: "Scale" },
];

const CHANNEL_LABEL: Record<string, string> = {
  search: "Search",
  pmax: "Performance Max",
  display: "Display",
  demand_gen: "Demand Gen",
};

// Fully client-side: runs the @growthos/logic unit-economics helpers (no backend, no AI).
export function BudgetPlanner() {
  const [budget, setBudget] = useState(3000);
  const [stage, setStage] = useState<BusinessStage>("growth");
  const [price, setPrice] = useState(120);
  const [cogs, setCogs] = useState(48);

  /**
   * Margin is derived, not entered.
   *
   * It used to be a third input alongside price and cost of goods, and the two disagreed from the
   * moment the page loaded: the defaults were margin 50, price 120, cost 48 — but 120 − 48 is 72.
   * The two output tiles then answered from different definitions of the same fact, because
   * `calculateTargetCpa` reads the typed margin while `calculateMinimumRoas` computes its own from
   * price and cost. Target CPA said the margin was $50 and Minimum ROAS said it was $72, side by
   * side, and nothing could ever reconcile them.
   */
  const margin = Math.max(0, price - cogs);

  const allocation = useMemo(() => allocateBudget(budget || 0, stage), [budget, stage]);
  const targetCpa = calculateTargetCpa(margin);
  const minRoas = calculateMinimumRoas(price || 0, cogs || 0);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Budget &amp; targets planner</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Set your unit economics to get a break-even target CPA, minimum ROAS, and a budget split — all
        from real math.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {/* Targets */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="price">Price ($)</Label>
              <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(+e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cogs">Cost of goods ($)</Label>
              <Input id="cogs" type="number" min={0} value={cogs} onChange={(e) => setCogs(+e.target.value)} />
            </div>
            <div className="col-span-2 flex items-baseline justify-between rounded-md border bg-secondary/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Margin per sale</span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {margin > 0 ? usd(margin) : "—"}
              </span>
            </div>
            {margin <= 0 && (
              <p className="col-span-2 text-xs text-destructive">
                Cost of goods is at or above the price, so there is no margin to spend on ads.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-secondary/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target CPA</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{usd(targetCpa)}</p>
              <p className="mt-1 text-xs text-muted-foreground">20% profit buffer</p>
            </div>
            <div className="rounded-lg border bg-secondary/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Min ROAS</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{minRoas.toFixed(2)}x</p>
              <p className="mt-1 text-xs text-muted-foreground">break-even</p>
            </div>
          </div>
        </div>

        {/* Allocation */}
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="budget">Monthly budget ($)</Label>
            <Input id="budget" type="number" min={0} value={budget} onChange={(e) => setBudget(+e.target.value)} />
          </div>
          <div className="flex gap-2">
            {STAGES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStage(s.value)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  stage === s.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary/60"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {allocation.map((row) => (
              <li key={row.channel} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{CHANNEL_LABEL[row.channel] ?? row.channel}</span>
                  <span className="tabular-nums">
                    {usd(row.amount)}{" "}
                    <span className="text-muted-foreground">({Math.round(row.pct * 100)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.pct * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
