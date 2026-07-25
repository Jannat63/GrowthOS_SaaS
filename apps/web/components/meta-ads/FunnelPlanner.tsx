"use client";
import { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import { buildFullFunnelPlan, type AccountMaturity } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { cn } from "@/lib/utils/cn";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const STAGE_TINT: Record<string, string> = {
  TOFU: "bg-primary",
  MOFU: "bg-success",
  BOFU: "bg-ink",
};

const MATURITY: { value: AccountMaturity; label: string }[] = [
  { value: "new", label: "New account" },
  { value: "established", label: "Established" },
];

// Fully client-side: runs the @growthos/logic full-funnel budget split (no backend, no AI).
export function FunnelPlanner() {
  const [budget, setBudget] = useState(5000);
  const [product, setProduct] = useState("Ergonomic Office Chair");
  const [maturity, setMaturity] = useState<AccountMaturity>("new");

  const plan = useMemo(
    () => buildFullFunnelPlan(budget || 0, product.trim() || "your product", maturity),
    [budget, product, maturity]
  );
  const total = plan.reduce((s, p) => s + p.budget, 0) || 1;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Full-funnel planner</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Split a monthly budget across TOFU / MOFU / BOFU with the right audience and objective per stage.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="funnel-budget">Monthly budget ($)</Label>
          <Input id="funnel-budget" type="number" min={0} value={budget} onChange={(e) => setBudget(+e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="funnel-product">Product</Label>
          <Input id="funnel-product" value={product} onChange={(e) => setProduct(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {MATURITY.map((m) => (
            <button
              key={m.value}
              onClick={() => setMaturity(m.value)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                maturity === m.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary/60"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {plan.map((stage) => (
          <div key={stage.stage} className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", STAGE_TINT[stage.stage])} />
                <span className="font-medium">{stage.stage}</span>
                <span className="text-sm text-muted-foreground">· {stage.objective}</span>
              </div>
              <span className="tabular-nums font-medium">
                {usd(stage.budget)}{" "}
                <span className="text-muted-foreground">({Math.round((stage.budget / total) * 100)}%)</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full", STAGE_TINT[stage.stage])}
                style={{ width: `${(stage.budget / total) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{stage.audience}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
