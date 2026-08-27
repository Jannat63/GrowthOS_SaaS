import type { DateRange } from "@/lib/stores/range";

/**
 * `?from=…&to=…` for an explicit range, or nothing at all when there isn't one.
 *
 * Sending no params is meaningful rather than lazy: the server then anchors the default window to
 * the newest day the workspace has data for, which the client cannot know before its first
 * response. See `resolveWindow` in apps/api/src/date-window.ts.
 */
export function rangeQuery(range: DateRange | null): string {
  if (!range) return "";
  return `?from=${range.from}&to=${range.to}`;
}

/** Stable cache key part for TanStack Query. */
export function rangeKey(range: DateRange | null): string {
  return range ? `${range.from}:${range.to}` : "default";
}
