import { Card } from "@growthos/ui/components/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function KpiCard({
  label,
  value,
  deltaPct,
}: {
  label: string;
  value: string;
  deltaPct: number;
}) {
  const up = deltaPct >= 0;
  return (
    <Card className="p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <div
        className={cn(
          "mt-1.5 inline-flex items-center gap-1 text-sm font-medium",
          up ? "text-success" : "text-destructive"
        )}
      >
        {up ? (
          <ArrowUpRight className="h-4 w-4" />
        ) : (
          <ArrowDownRight className="h-4 w-4" />
        )}
        {up ? "+" : ""}
        {deltaPct}%
        <span className="font-normal text-muted-foreground">vs last 30d</span>
      </div>
    </Card>
  );
}
