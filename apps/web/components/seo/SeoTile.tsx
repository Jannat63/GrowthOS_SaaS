import { Card } from "@growthos/ui/components/card";

export function SeoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
