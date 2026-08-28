import { seedDates } from "@growthos/logic/fixtures";

/**
 * The seeded dates an offline request covers, mirroring `resolveWindow` on the API.
 *
 * With no explicit range the API returns the last N days of AVAILABLE data, not the last N days
 * before today: the seed ends at `SEED_LAST_DAY` and every preset anchors there. An earlier mock
 * counted FORWARD from a hardcoded date instead, which only lined up for a 30-day request — 7 days
 * showed the wrong week, and 90 days invented two months of dates past the end of the seed.
 *
 * Shared by every offline fallback that windows seeded data, so they cannot disagree about what
 * "the last 30 days" means.
 */
export function seedWindow(range: { from: string; to: string } | null, days: number): string[] {
  const all = seedDates();
  if (!range) return all.slice(-days);
  return all.filter((d) => d >= range.from && d <= range.to);
}
