/**
 * Relative time, for surfaces where "how long" is the question and "when" is the footnote.
 *
 * The admin console reads in elapsed time: a connection that last synced `9d ago` is a problem, a
 * trial ending `in 2 days` is a phone call, and `8/13/2026` is neither until you have done the
 * arithmetic yourself. So every timestamp there renders through `relativeTime` with `absoluteTime`
 * in the `title`, which keeps the exact value one hover away for the moment someone needs to paste
 * it into a support thread.
 *
 * `Intl.RelativeTimeFormat` does the wording, so plurals, "yesterday" and "last month" come out
 * right without a table of special cases, and it handles both directions — the console needs past
 * (last synced, joined) and future (trial ends, subscription cancels) from the same helper.
 *
 * These are client-side helpers on purpose. Everything that calls them renders from data fetched
 * in the browser by TanStack Query, so there is no server pass to disagree with. Calling them
 * during SSR would eventually produce a hydration mismatch, because the two renders happen at
 * different moments and `Date.now()` moves between them.
 */

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30.436875;
const YEAR = DAY * 365.25;

/** Largest unit first is wrong here: we want the smallest unit the gap still fills. */
const UNITS: Array<{ seconds: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { seconds: YEAR, unit: "year" },
  { seconds: MONTH, unit: "month" },
  { seconds: WEEK, unit: "week" },
  { seconds: DAY, unit: "day" },
  { seconds: HOUR, unit: "hour" },
  { seconds: MINUTE, unit: "minute" },
  { seconds: 1, unit: "second" },
];

type Style = "long" | "short";

const FORMATTERS: Record<Style, Intl.RelativeTimeFormat> = {
  // `numeric: "auto"` is what turns "1 day ago" into "yesterday".
  long: new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "long" }),
  // `short` gives "9 days ago" -> "9 days ago" in en; `narrow` gives "9d ago". Tables want narrow.
  short: new Intl.RelativeTimeFormat(undefined, { numeric: "always", style: "narrow" }),
};

/**
 * `9d ago`, `in 2 days`, `just now`. Returns an em dash for a missing value so a table cell is
 * never blank — an empty cell reads as a rendering bug, a dash reads as "nothing recorded".
 *
 * @param style `short` (default) is for table cells and badges; `long` for prose.
 */
export function relativeTime(
  value: string | number | Date | null | undefined,
  style: Style = "short"
): string {
  const date = toDate(value);
  if (!date) return "—";

  const deltaSeconds = (date.getTime() - Date.now()) / 1000;
  const magnitude = Math.abs(deltaSeconds);

  // Below a minute every wording is noise — "in 4 seconds" and "8 seconds ago" both mean now.
  if (magnitude < 45) return "just now";

  for (const { seconds, unit } of UNITS) {
    if (magnitude >= seconds) {
      return FORMATTERS[style].format(Math.round(deltaSeconds / seconds), unit);
    }
  }
  return "just now";
}

/** The full timestamp, for a `title` attribute or anywhere the exact moment is the point. */
export function absoluteTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "Not recorded";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Whole days from now, rounded toward the present, for thresholds rather than display —
 * `daysUntil(trialEndsAt) <= 3` is the rule that decides whether a row is gold.
 * Negative once the date has passed.
 */
export function daysUntil(value: string | number | Date | null | undefined): number | null {
  const date = toDate(value);
  if (!date) return null;
  return Math.floor((date.getTime() - Date.now()) / (DAY * 1000));
}

/** Positive whole days since a past date; null if there is no date. */
export function daysSince(value: string | number | Date | null | undefined): number | null {
  const days = daysUntil(value);
  return days === null ? null : -days;
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  // An unparseable string yields an Invalid Date, whose getTime() is NaN and whose every
  // comparison is false — it would render as "just now", which is worse than admitting nothing.
  return Number.isNaN(date.getTime()) ? null : date;
}
