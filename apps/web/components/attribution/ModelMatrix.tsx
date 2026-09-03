"use client";
import { channelLabel, type AttributionModel, type ChannelSpread } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@growthos/ui/components/table";
import { cn } from "@/lib/utils/cn";
import { MODELS, usd } from "./models";

/**
 * Every model against every channel — the precise reference behind the chart.
 *
 * Kept from the original page, because a reader who has seen the shape of the
 * disagreement will want the exact figures, and re-typed as something other than
 * a wall of twenty-five equally weighted numbers:
 *
 * - **The selected model's column is lit and the other four recede.** The table
 *   is then "your column, in context" rather than a grid to be scanned. Column
 *   headers are buttons, so the table is also a second control for the same
 *   state — clicking `Time decay` here moves every marker in the chart above.
 * - **Rows are ordered by swing**, matching the chart, so the two panels can be
 *   read against each other without re-finding a channel.
 * - **A swing column**, because the comparison the row invites is a subtraction
 *   nobody should have to do across five columns of dollars.
 * - **A totals row.** Every model divides the same pot; that the five columns
 *   land on an identical figure is the fact that makes the whole page legible,
 *   and it was nowhere on screen before.
 */
export function ModelMatrix({
  spread,
  selected,
  onSelect,
  totalRevenue,
}: {
  spread: ChannelSpread[];
  selected: AttributionModel;
  onSelect: (model: AttributionModel) => void;
  totalRevenue: number;
}) {
  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pb-4 pt-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Full comparison
          </p>
          <h2 className="mt-1.5 font-display text-lg font-semibold tracking-tight">
            Every model, every channel
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">Select a column to change the model.</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Channel</TableHead>
              {MODELS.map((m) => {
                const active = m.key === selected;
                return (
                  <TableHead
                    key={m.key}
                    aria-sort="none"
                    className={cn("p-0 text-right", active && "bg-primary/5")}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(m.key)}
                      aria-pressed={active}
                      className={cn(
                        "h-12 w-full whitespace-nowrap px-4 text-right font-medium transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        active ? "text-primary" : "hover:text-primary",
                      )}
                    >
                      {m.label}
                    </button>
                  </TableHead>
                );
              })}
              <TableHead className="pr-6 text-right">Swing</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {spread.map((s) => (
              <TableRow key={s.channel}>
                <TableCell className="pl-6 font-medium">{channelLabel(s.channel)}</TableCell>
                {MODELS.map((m) => {
                  const active = m.key === selected;
                  return (
                    <TableCell
                      key={m.key}
                      className={cn(
                        "text-right font-mono tabular-nums transition-colors",
                        active
                          ? "bg-primary/5 font-semibold text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {usd(s.byModel[m.key])}
                    </TableCell>
                  );
                })}
                <TableCell className="pr-6 text-right font-mono tabular-nums">
                  {s.swing > 0 ? (
                    <>
                      {usd(s.swing)}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {Math.round(s.swingShare * 100)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell className="pl-6 font-medium">Total distributed</TableCell>
              {MODELS.map((m) => (
                <TableCell
                  key={m.key}
                  className={cn(
                    "text-right font-mono tabular-nums",
                    m.key === selected ? "bg-primary/5 text-foreground" : "text-muted-foreground",
                  )}
                >
                  {usd(totalRevenue)}
                </TableCell>
              ))}
              <TableCell className="pr-6 text-right text-muted-foreground">—</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <p className="px-6 pb-6 pt-4 text-xs text-muted-foreground">
        Every column sums to the same {usd(totalRevenue)}. A model does not create or destroy
        revenue — it only moves credit between channels, so a gain in one row is a loss in another.
      </p>
    </Card>
  );
}
