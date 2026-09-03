"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { Calendar, type DateRange } from "@growthos/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@growthos/ui/components/popover";
import { cn } from "@/lib/utils/cn";

/**
 * The window the overview's charts cover.
 *
 * Presets first, calendar second, and deliberately in that order: "the last 30 days" is what an
 * operator wants nine times out of ten, and making them navigate a month grid to express it would
 * be a worse tool than the fixed window it replaced. The calendar is there for the tenth time —
 * the specific fortnight a customer is asking about.
 *
 * The range governs the time series only. Every "right now" figure on the page ignores it, because
 * "how many workspaces exist" has no meaningful answer for last March, and the page says so where
 * those figures are rather than leaving it to be inferred.
 */

export type { DateRange };

const PRESETS: { label: string; days: number | null }[] = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  // Null hands the window back to the server, which anchors on the last day of available data
  // rather than on today — the only setting that is guaranteed to draw something.
  { label: "All data", days: null },
];

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  // Held separately so a half-made selection — one endpoint clicked — does not refetch the page on
  // every click. It is committed when the popover closes or the second date lands.
  const [draft, setDraft] = useState<DateRange | undefined>(value);

  function applyPreset(days: number | null) {
    if (days === null) {
      onChange(undefined);
      setDraft(undefined);
    } else {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const range = { from, to };
      onChange(range);
      setDraft(range);
    }
    setOpen(false);
  }

  function commit(next: DateRange | undefined) {
    setDraft(next);
    // Only once both ends exist: a single click is the start of a range, not a one-day window.
    if (next?.from && next.to) {
      onChange(next);
      setOpen(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Closing on a half-made selection discards it rather than leaving the button describing a
        // window the charts are not showing.
        if (!next) setDraft(value);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-normal">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-mono text-xs">{describe(value)}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-wrap gap-1 border-b p-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.days)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                p.days === null && !value
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Calendar
          mode="range"
          selected={draft}
          onSelect={commit}
          numberOfMonths={2}
          defaultMonth={value?.from}
          // A window cannot end after today; offering tomorrow only produces an empty chart.
          disabled={{ after: new Date() }}
          autoFocus
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

/** What the button says. Plain dates, because the operator picked plain dates. */
function describe(range: DateRange | undefined): string {
  if (!range?.from) return "All data";
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (!range.to) return fmt(range.from);
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}
