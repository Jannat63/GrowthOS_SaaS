import type { CampaignInput } from "../engines/google-ads-advisor.js";
import { adCampaigns } from "./google-ads.js";
import { metaCampaigns } from "./meta-ads.js";

/**
 * The seeded demo account's ad performance — ONE definition, shared by the API and the browser.
 *
 * WHY THIS MOVED HERE. The same arithmetic used to exist twice: `seedRows()` in
 * `apps/api/src/analytics.ts` generated what ClickHouse returns, and `apps/web/lib/mock-data/mer.ts`
 * re-implemented it by hand because `apps/web` cannot import from `apps/api`. That duplication was
 * flagged as known-and-unfixed in AUDIT-2026-08-28-analytics.md, on the grounds that the real fix
 * would touch the API. It has since had to be touched anyway, and the campaign pages need a third
 * copy — so the copies became one module both sides import.
 *
 * It lives under `fixtures/` rather than `engines/` because that is what it is: demonstration data,
 * not business logic. It is pure and deterministic, so unlike the API-side original it is covered by
 * a suite that runs with no infrastructure at all.
 *
 * WHAT CHANGED WITH IT. The seed used to insert exactly one campaign per platform — `g-1` and
 * `m-1` — while both campaign pages fell back to the four/five-campaign fixture rosters below.
 * Live returned a one-row table with no wasted spend to detect; offline returned a full portfolio
 * with a red wasted-spend panel. Same page, two different products. The roster is now the same on
 * both sides: the day's platform totals are split across the fixture campaigns by their own
 * metric shares.
 *
 * The daily platform totals are deliberately UNCHANGED by that split. Blended MER, the Growth Hub
 * tiles, the weekly report and the intelligence report all read `sum(...)` across campaigns, so
 * preserving the totals to the cent keeps every one of those figures exactly where the seed
 * calibration left it. `seed.test.ts` asserts it rather than trusting it.
 */

/**
 * THE WINDOW INVARIANT: SEED_DAYS >= 2 x the largest range a dashboard offers (90 today, in
 * `apps/web/lib/stores/range.ts`). The Growth Hub compares a window against the one before it, so
 * at 30 seeded days under a 30-day window the comparison matched zero rows, every `previous` came
 * back 0, and not one trend indicator rendered anywhere in the product. Dropping below 2x
 * re-breaks it silently, and only for the longest range.
 *
 * The window is anchored at its END, so raising this extends history backwards rather than moving
 * "now": everything keyed off `max(date)` keeps behaving identically.
 */
export const SEED_DAYS = 180;

/** Last seeded day. Fixed rather than `today()` so seeded figures are reproducible across runs. */
export const SEED_LAST_DAY = "2026-07-17";

/**
 * Blended-revenue stand-in until real Shopify data (M3): ad-attributed value scaled up for organic.
 *
 * Shared so every surface reporting "revenue" derives it the same way — two copies of this constant
 * would let the MER dashboard and the Growth Hub quietly disagree.
 */
export const REVENUE_FACTOR = 2.2;

export type SeedPlatform = "google_ads" | "meta_ads";

/** One campaign's figures for one day — the shape of an `ad_performance` row. */
export interface SeedAdRow {
  platform: SeedPlatform;
  campaignId: string;
  campaignName: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
}

/** One platform's figures for one day, before the campaign split. */
export interface SeedPlatformDay {
  platform: SeedPlatform;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const cents = (n: number) => Math.round(n * 100);

/** Every date in the seed window, oldest first, as `YYYY-MM-DD`. */
export function seedDates(): string[] {
  const end = new Date(`${SEED_LAST_DAY}T00:00:00Z`);
  return Array.from({ length: SEED_DAYS }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - (SEED_DAYS - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

/**
 * Total drift across the WHOLE seed window, spread evenly over it.
 *
 * The drift terms were once `day * 0.012` (revenue) and `day * 0.008` (conversions) — per-day
 * constants calibrated when the seed was 30 days long. `day` indexes the full window, so when
 * SEED_DAYS became 180 the same constants compounded six times as far: revenue inflated 216% across
 * the window while spend has no drift at all, pushing blended MER from 10.85x over the first 30 days
 * to 27.43x over the last, and it would have climbed again on any future widening.
 *
 * As a fraction of the window the lift stays what it was meant to be whatever SEED_DAYS becomes.
 * The drift itself stays: it exists so period-over-period deltas are non-zero, and at these values a
 * 30-day window still moves ~4% on revenue and ~6% on conversions.
 */
const drift = (day: number, totalOverWindow: number) => (day / SEED_DAYS) * totalOverWindow;

/** Per-platform daily base figures. The campaign split divides these; it never changes them. */
const BASE = {
  google_ads: { impressions: 1000, impressionsPerDay: 10, clicks: 80, spend: 45.5, conversions: 6, value: 320 },
  meta_ads: { impressions: 5000, impressionsPerDay: 20, clicks: 120, spend: 90.25, conversions: 4, value: 210 },
} as const;

/**
 * One platform's totals for one day.
 *
 * Deterministic day-to-day variance so the trends read as alive: a weekend dip in spend, a
 * sinusoidal swing in revenue, and mild upward drift. Conversions drift too — they used to be a flat
 * 6/4 every single day, which made the Conversions tile report a permanent 0% change, and a headline
 * KPI that never moves reads as a broken tile rather than as a stable business.
 */
function platformDay(platform: SeedPlatform, date: string, day: number): SeedPlatformDay {
  const b = BASE[platform];
  const d = new Date(`${date}T00:00:00Z`);
  const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
  const spendFactor = (weekend ? 0.7 : 1) * (1 + Math.sin(day / 3) * 0.12);
  const revFactor = 1 + Math.sin(day / 2.5 + 1) * 0.28 + drift(day, 0.36) + (weekend ? 0.08 : 0);
  const convFactor = 1 + Math.sin(day / 3.5) * 0.18 + drift(day, 0.24);
  return {
    platform,
    date,
    impressions: b.impressions + day * b.impressionsPerDay,
    clicks: b.clicks + day,
    spend: round2(b.spend * spendFactor),
    conversions: Math.max(1, Math.round(b.conversions * convFactor)),
    conversionValue: round2(b.value * revFactor),
  };
}

/** Every platform-day in the window, oldest first. */
export function seedPlatformDays(): SeedPlatformDay[] {
  const out: SeedPlatformDay[] = [];
  seedDates().forEach((date, day) => {
    out.push(platformDay("google_ads", date, day));
    out.push(platformDay("meta_ads", date, day));
  });
  return out;
}

/**
 * Which campaigns the seeded account runs, per platform.
 *
 * The rosters are the same objects the offline fallbacks already used, so live and offline now name
 * the same campaigns. Their figures are read as SHARES, not as absolute values: the fixtures state
 * one window's totals for a demo account, while the seed states a per-day budget over 180 days, and
 * the two cannot both be literal. Taking the shares keeps what the fixtures were written to express
 * — a scaling retargeting campaign, a healthy prospecting one, and a broad campaign burning money.
 */
const ROSTER: Record<SeedPlatform, CampaignInput[]> = {
  google_ads: adCampaigns,
  meta_ads: metaCampaigns,
};

type Metric = "clicks" | "conversions" | "cost" | "conversionValue";

function sharesOf(campaigns: CampaignInput[], metric: Metric): number[] {
  const total = campaigns.reduce((s, c) => s + c[metric], 0);
  // A metric no campaign has any of splits evenly rather than dividing by zero.
  if (total <= 0) return campaigns.map(() => 1 / campaigns.length);
  return campaigns.map((c) => c[metric] / total);
}

/**
 * Splits a running total across shares so each day's parts sum EXACTLY to that day's total while
 * every campaign's long-run share converges on its target.
 *
 * Rounding each day independently cannot do both. Meta seeds four to six conversions a day across
 * four campaigns; rounding four fractional shares either loses a conversion or invents one on
 * almost every day, and a campaign whose share is under half a conversion a day gets zero forever —
 * which would have handed the smallest campaign a permanent "zero conversions despite significant
 * clicks" verdict that its own share does not support.
 *
 * Rounding the CUMULATIVE boundaries instead fixes both at once. With running total T and prefix
 * shares P, campaigns 0..i together hold `round(T x P_i)`; a single campaign's running figure is the
 * difference between two neighbouring boundaries, and its figure for today is how much that moved.
 * Every day's parts are therefore a difference of two exact partitions of an integer, so they always
 * sum back to the day's total, and no share is too small to eventually accumulate.
 */
function cumulativeSplitter(shares: number[]): (dayTotal: number) => number[] {
  const prefix: number[] = [];
  shares.reduce((acc, s, i) => {
    const next = acc + s;
    // The last boundary must be exactly 1, or float drift loses or gains a unit at the end.
    prefix[i] = i === shares.length - 1 ? 1 : next;
    return next;
  }, 0);

  let running = 0;
  let previous = shares.map(() => 0);
  return (dayTotal: number): number[] => {
    running += dayTotal;
    const boundaries = prefix.map((p) => Math.round(running * p));
    const out = boundaries.map((b, i) => {
      const nowCumulative = b - (i === 0 ? 0 : boundaries[i - 1]!);
      return nowCumulative - previous[i]!;
    });
    previous = boundaries.map((b, i) => b - (i === 0 ? 0 : boundaries[i - 1]!));
    return out;
  };
}

/**
 * Every seeded `ad_performance` row, oldest first.
 *
 * `only` limits which dates come back so a workspace missing part of the window backfills just the
 * gap. The split is still computed across the FULL window and filtered at the end: both `day` and
 * the cumulative allocation are positions within the whole seed, so a row's figures never depend on
 * which subset happened to be asked for.
 */
export function seedAdRows(only?: Set<string>): SeedAdRow[] {
  const days = seedPlatformDays();
  const rows: SeedAdRow[] = [];

  for (const platform of ["google_ads", "meta_ads"] as const) {
    const campaigns = ROSTER[platform];
    const split = {
      impressions: cumulativeSplitter(sharesOf(campaigns, "clicks")),
      clicks: cumulativeSplitter(sharesOf(campaigns, "clicks")),
      spend: cumulativeSplitter(sharesOf(campaigns, "cost")),
      conversions: cumulativeSplitter(sharesOf(campaigns, "conversions")),
      conversionValue: cumulativeSplitter(sharesOf(campaigns, "conversionValue")),
    };

    for (const d of days.filter((x) => x.platform === platform)) {
      // Money splits in cents; a fraction of a cent has nowhere to go in a Decimal(12,2) column.
      const impressions = split.impressions(d.impressions);
      const clicks = split.clicks(d.clicks);
      const spend = split.spend(cents(d.spend));
      const conversions = split.conversions(d.conversions);
      const value = split.conversionValue(cents(d.conversionValue));

      if (only && !only.has(d.date)) continue;
      campaigns.forEach((c, i) => {
        rows.push({
          platform,
          campaignId: c.id,
          campaignName: c.name,
          date: d.date,
          impressions: impressions[i]!,
          clicks: clicks[i]!,
          spend: spend[i]! / 100,
          conversions: conversions[i]!,
          conversionValue: value[i]! / 100,
        });
      });
    }
  }

  return rows;
}

/** The campaign roster for a platform — ids and names, in the order the seed writes them. */
export function seedRoster(platform: SeedPlatform): CampaignInput[] {
  return ROSTER[platform];
}
