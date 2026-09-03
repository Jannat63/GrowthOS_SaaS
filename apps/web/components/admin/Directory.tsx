"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TableCell, TableRow } from "@growthos/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@growthos/ui/components/select";
import { cn } from "@/lib/utils/cn";
import { spineClass, type Tone } from "@/components/admin/tone";

/**
 * The shared parts of a directory: filter chips, a sort control, a pager, and a row that is a link.
 *
 * These belong together because they are one behaviour split across three controls — narrow the
 * set, order it, walk it — and all three have to agree that the set is the whole table, not the
 * page. Filtering client-side over the fifty loaded rows would answer "which accounts are past
 * due" with "the past-due ones on page one", which is worse than not offering the filter.
 */

// ── Filters ──────────────────────────────────────────────────────────────────

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Chips, not a dropdown. There are four of them, each is a question an operator asks often, and a
 * chip shows which one is active without being opened. "All" is a chip too, so turning a filter off
 * is the same gesture as turning one on.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: FilterOption<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      <Chip active={value === undefined} onClick={() => onChange(undefined)}>
        All
      </Chip>
      {options.map((o) => (
        <Chip
          key={o.value}
          active={value === o.value}
          onClick={() => onChange(value === o.value ? undefined : o.value)}
        >
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}

// ── Sort ─────────────────────────────────────────────────────────────────────

export function SortSelect<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger aria-label={label} className="h-8 w-auto min-w-40 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Pager ────────────────────────────────────────────────────────────────────

/**
 * Walking the whole table, one page at a time.
 *
 * The directories previously rendered the first fifty rows and said "Showing 50 of 52", with no way
 * to reach the other two — the API had supported `limit`/`offset` the whole time and nothing ever
 * sent them.
 *
 * It renders as the table's own footer rather than as a separate block floating below it: the
 * controls that move you through a table belong attached to that table, and a right-aligned pair of
 * arrows adrift in the whitespace under a bordered box reads as unrelated to it.
 *
 * Always rendered, even on a single page, so the row count is stated and the table's bottom edge
 * does not move as you page through.
 */
export function Pager({
  offset,
  limit,
  total,
  noun,
  nounPlural,
  onOffsetChange,
}: {
  offset: number;
  limit: number;
  total: number;
  /** Singular; used as "1-20 of 312 workspaces". */
  noun: string;
  /** Only where -s is wrong: entry/entries, person/people. */
  nounPlural?: string;
  onOffsetChange: (offset: number) => void;
}) {
  const plural = nounPlural ?? `${noun}s`;
  const first = total === 0 ? 0 : offset + 1;
  const last = Math.min(offset + limit, total);
  const atStart = offset === 0;
  const atEnd = last >= total;
  const onePage = total <= limit;

  return (
    <div className="flex items-center justify-between gap-4 border-t px-3 py-2">
      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        {total === 0
          ? `No ${plural}`
          : onePage
            ? `${total} ${total === 1 ? noun : plural}`
            : `${first}–${last} of ${total} ${plural}`}
      </p>
      {!onePage && (
        <div className="flex items-center gap-1">
          <PageButton
            disabled={atStart}
            onClick={() => onOffsetChange(Math.max(0, offset - limit))}
            label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </PageButton>
          <PageButton
            disabled={atEnd}
            onClick={() => onOffsetChange(offset + limit)}
            label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </PageButton>
        </div>
      )}
    </div>
  );
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

// ── The row ──────────────────────────────────────────────────────────────────

/**
 * A row whose whole surface is a link, and whose left edge is the state spine.
 *
 * Only the name cell used to be clickable — a 90px target inside a 1200px row. The anchor still
 * lives in the name cell, so there is exactly one tab stop and middle-click and "copy link
 * address" behave as they should, but `RowLink` stretches it over the row with an absolutely
 * positioned pseudo-element. No extra column, no click handler on the `<tr>`, and the row is still
 * a link rather than something that merely acts like one.
 *
 * Anything inside the row that has to stay independently clickable needs `relative z-10` to sit
 * above the stretched area.
 */
export function LinkedRow({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <TableRow
      className={cn(
        // `group` so a cell can react to the row being hovered — the title turning into a link
        // colour, chiefly, which is what tells you the row is clickable before you click it.
        "group relative border-l-2 transition-colors hover:bg-primary/10 focus-within:bg-secondary/50",
        spineClass(tone)
      )}
    >
      {children}
    </TableRow>
  );
}

/** The anchor for a `LinkedRow`. Put it in the first cell; it covers the whole row. */
export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="after:absolute after:inset-0 after:rounded-sm focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
    >
      {children}
    </Link>
  );
}
