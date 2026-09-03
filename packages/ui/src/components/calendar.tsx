"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DateRange, type DayPickerProps } from "react-day-picker";
import { cn } from "../lib/utils";

/**
 * Calendar — react-day-picker v10, styled through the theme tokens.
 *
 * Every colour is a token (`--primary`, `--accent`, `--muted-foreground`…), never a literal, so the
 * calendar follows light/dark and a white-labelled workspace's `--primary` override without a second
 * definition. react-day-picker ships no stylesheet here — the `classNames` map below is the whole
 * appearance.
 *
 * Two things about v10's DOM that this styling depends on, both of which bit the first version:
 *
 * 1. `data-selected` / `data-disabled` / `data-today` live on the `<td>` (the `day` element), not on
 *    the `<button>` inside it. A `:has(> [data-selected])` selector on the cell never matches.
 * 2. In range mode a middle day carries BOTH `selected` and `range_middle`. Tailwind resolves that
 *    conflict by stylesheet order, not by the order the classes are listed here, so the two must
 *    not compete for the same properties at all — the first version let them, and the middle of
 *    every range rendered as white `text-primary-foreground` on a transparent cell, i.e. invisible
 *    on a light popover, which read as the days being missing entirely.
 *
 *    The fix is an explicit exclusion rather than an `!important`: `RANGE_MIDDLE` is an inert
 *    marker class, and `selected` only paints a cell that does not carry it. Deterministic
 *    regardless of stylesheet order — and not reliant on Tailwind's important modifier, whose
 *    syntax moved from a leading `!` to a trailing one in v4.
 */
export type CalendarProps = DayPickerProps & { className?: string };

/** Re-exported so consumers get the selection type without depending on react-day-picker directly. */
export type { DateRange };

/**
 * `gos-range-middle` is an inert marker on the cells between a range's endpoints. It carries no
 * styling itself — it exists so `selected` can exclude those cells by selector instead of racing
 * them in the cascade.
 *
 * Written out literally in both places below rather than interpolated from a constant: Tailwind
 * extracts classes by scanning source text, so a class assembled with `${...}` is never generated
 * and the rule silently would not exist.
 */

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      // `relative` is load-bearing: the nav is absolutely positioned and would otherwise anchor to
      // whatever positioned ancestor it found — in a popover, the popover itself.
      className={cn("relative", className)}
      classNames={{
        months: "flex flex-col gap-5 sm:flex-row sm:gap-6",
        month: "flex w-full flex-col gap-3",
        month_caption: "flex h-7 items-center justify-center",
        caption_label: "text-sm font-semibold tracking-tight",

        // Spans the full width so the chevrons sit at the outer edges of the whole calendar,
        // level with the month captions rather than stacked above them.
        nav: "absolute inset-x-0 top-0 z-10 flex h-7 items-center justify-between",
        button_previous: navButton,
        button_next: navButton,

        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground",
        week: "mt-1 flex w-full",

        // The cell carries the range background so a run of days reads as one continuous band
        // instead of nine detached squares.
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button: cn(
          "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md p-0 font-normal tabular-nums",
          "transition-colors hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "disabled:pointer-events-none"
        ),

        selected: cn(
          "[&:not(.gos-range-middle)>button]:bg-primary",
          "[&:not(.gos-range-middle)>button]:text-primary-foreground",
          "[&:not(.gos-range-middle)>button]:hover:bg-primary"
        ),
        range_start: "rounded-l-md bg-accent",
        range_end: "rounded-r-md bg-accent",
        range_middle: cn(
          "gos-range-middle",
          "bg-accent first:rounded-l-md last:rounded-r-md",
          "[&>button]:text-foreground [&>button]:hover:bg-primary/15"
        ),

        today: "[&>button]:font-semibold [&>button]:text-primary",
        outside: "[&>button]:text-muted-foreground/40",
        // Muted and non-interactive. A strikethrough reads as "cancelled" rather than "no data
        // here", and at 30 struck-through cells it made the month look broken.
        disabled: "[&>button]:cursor-not-allowed [&>button]:text-muted-foreground/35",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...rest} />
          ) : (
            <ChevronRight className="h-4 w-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

const navButton = cn(
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md",
  "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "aria-disabled:pointer-events-none aria-disabled:opacity-30"
);
