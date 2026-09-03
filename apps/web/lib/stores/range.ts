import { create } from "zustand";

/**
 * The reporting window every dashboard module reads.
 *
 * Client state rather than a URL param or per-page `useState` for one reason: the range is a
 * property of the session, not of a page. Someone who switches the Growth Hub to 90 days and then
 * opens Analytics is still asking about 90 days — resetting on every navigation would make the
 * control feel like it had not worked.
 *
 * `null` means "no explicit range": the API then defaults to the last `DEFAULT_PRESET_DAYS` days of
 * available data. That default deliberately lives on the server, because only the server knows how
 * far the workspace's data actually runs — see `resolveWindow` in apps/api/src/date-window.ts.
 */
export interface DateRange {
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
}

/**
 * Quick presets, in days. These are relative to the newest day with DATA, not to today — the picker
 * anchors them to the `dataThrough` the API reports. Anchoring to today would return an empty
 * dashboard for every workspace whose data does not run to the present, which is all of them before
 * a live integration is connected.
 */
export const RANGE_PRESETS = [
  { days: 7, label: "7d", description: "Last 7 days" },
  { days: 30, label: "30d", description: "Last 30 days" },
  { days: 90, label: "90d", description: "Last 90 days" },
] as const;

export const DEFAULT_PRESET_DAYS = 30;

interface RangeState {
  /** null = let the server pick the default window. */
  range: DateRange | null;
  setRange: (range: DateRange | null) => void;
}

export const useRangeStore = create<RangeState>((set) => ({
  range: null,
  setRange: (range) => set({ range }),
}));

/** `2026-06-18` → `18 Jun`, or `18 Jun 2026` when the year is worth stating. */
export function formatDay(iso: string, withYear = false): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

/** Inclusive day count of a range — 1 Jun to 10 Jun is ten days, not nine. */
export function rangeLength(range: DateRange): number {
  const from = new Date(`${range.from}T00:00:00Z`).getTime();
  const to = new Date(`${range.to}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
}

/** The range covering the last `days` days ending at (and including) `anchor`. */
export function presetRange(anchor: string, days: number): DateRange {
  const to = new Date(`${anchor}T00:00:00Z`);
  const from = new Date(to);
  from.setUTCDate(to.getUTCDate() - (days - 1));
  return { from: from.toISOString().slice(0, 10), to: anchor };
}
