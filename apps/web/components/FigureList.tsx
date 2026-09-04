import { cn } from "@/lib/utils/cn";

export type Figure = {
  key: string;
  label: string;
  value: React.ReactNode;
};

/**
 * A table row, read as a record.
 *
 * Several tables in this app carry four or five numeric columns beside an identity column, which
 * is more than a phone has room for. The two usual escapes are both bad: horizontal scrolling puts
 * the identity and the figure being compared on opposite sides of the viewport, and hiding columns
 * leaves the reader unable to tell an omitted figure from a zero. Below the breakpoint the row
 * becomes a labelled ledger instead — every figure kept, nothing to swipe.
 *
 * It lives here rather than in each page because the pattern has to look the same everywhere:
 * someone who learns it on the weekly report should recognise it on the rank tracker. The figures
 * themselves stay defined next to the table they belong to — this only decides how a label and a
 * value sit together.
 */
export function FigureList({ figures, className }: { figures: Figure[]; className?: string }) {
  return (
    <dl className={cn("space-y-1.5", className)}>
      {figures.map((f) => (
        <div key={f.key} className="flex items-baseline justify-between gap-4">
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd className="text-sm tabular-nums">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
