// Cross-channel attribution (M4 P4.1) — deterministic multi-touch models over conversion paths.
// No LLM (D4). Each path is the ordered list of channel touchpoints that led to one conversion; a
// model distributes that conversion's credit (1 conversion + its revenue) across those touchpoints.

export type AttributionModel =
  | "last_click"
  | "first_click"
  | "linear"
  | "time_decay"
  | "position_based";

export const ATTRIBUTION_MODELS: AttributionModel[] = [
  "last_click",
  "first_click",
  "linear",
  "time_decay",
  "position_based",
];

export interface Touchpoint {
  channel: string;
  order: number; // 0-based position within the path (0 = first touch)
}

export interface ConversionPath {
  id: string;
  conversionValue: number;
  touchpoints: Touchpoint[];
}

export interface ChannelCredit {
  channel: string;
  conversions: number; // fractional credit summed across paths
  revenue: number;
}

const TIME_DECAY_RATE = 0.7; // each step back from the converting touch keeps 70% of the weight

/** Credit weights for a path of length n under a model. Always sums to 1 (n >= 1). */
export function modelWeights(model: AttributionModel, n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1];

  switch (model) {
    case "first_click":
      return Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 0));
    case "last_click":
      return Array.from({ length: n }, (_, i) => (i === n - 1 ? 1 : 0));
    case "linear":
      return Array.from({ length: n }, () => 1 / n);
    case "time_decay": {
      // Later touches weigh more: raw_i = rate^(distance from the last touch).
      const raw = Array.from({ length: n }, (_, i) => TIME_DECAY_RATE ** (n - 1 - i));
      const total = raw.reduce((s, w) => s + w, 0);
      return raw.map((w) => w / total);
    }
    case "position_based": {
      // 40% first, 40% last, 20% split among the middle.
      if (n === 2) return [0.5, 0.5];
      const mid = 0.2 / (n - 2);
      return Array.from({ length: n }, (_, i) => (i === 0 || i === n - 1 ? 0.4 : mid));
    }
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Attribute all paths under one model → per-channel conversions + revenue, best revenue first. */
export function attribute(paths: ConversionPath[], model: AttributionModel): ChannelCredit[] {
  const byChannel = new Map<string, { conversions: number; revenue: number }>();

  for (const path of paths) {
    const ordered = [...path.touchpoints].sort((a, b) => a.order - b.order);
    const w = modelWeights(model, ordered.length);
    ordered.forEach((tp, i) => {
      const agg = byChannel.get(tp.channel) ?? { conversions: 0, revenue: 0 };
      agg.conversions += w[i]!;
      agg.revenue += w[i]! * path.conversionValue;
      byChannel.set(tp.channel, agg);
    });
  }

  return [...byChannel.entries()]
    .map(([channel, v]) => ({
      channel,
      conversions: round2(v.conversions),
      revenue: round2(v.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Run every model over the same paths — the comparison view's data. */
export function attributeAll(paths: ConversionPath[]): Record<AttributionModel, ChannelCredit[]> {
  const out = {} as Record<AttributionModel, ChannelCredit[]>;
  for (const model of ATTRIBUTION_MODELS) out[model] = attribute(paths, model);
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Derived views over the models.

   The comparison is the product, not the individual figures: a channel whose
   credit is stable across all five models is a channel you can budget against,
   and one that swings is a channel whose number is a consequence of a setting
   rather than of the data. Both derivations below live here, next to the engine
   that produces the inputs, because the API renders the same conclusions into
   the weekly PDF and a second copy in the web app would drift from this one.
   ───────────────────────────────────────────────────────────────────────────── */

export interface ChannelSpread {
  channel: string
  /** Credit under each model — carried so a renderer never re-scans the model lists. */
  byModel: Record<AttributionModel, number>
  min: number
  max: number
  /** `max - min`: the credit that is a consequence of the model, not of the data. */
  swing: number
  /** `swing` as a share (0..1) of the revenue being distributed. */
  swingShare: number
}

/** Total conversion value across the paths — the pot every model redistributes.
 *
 * Taken from the paths rather than by summing a model's credits: the per-channel
 * figures are rounded to cents, so summing them lands a fraction off the true
 * total (linear over the seeded paths sums to 1555.01, not 1555) and a "totals"
 * row built that way would visibly disagree with itself between columns. */
export function pathsRevenue(paths: ConversionPath[]): number {
  return paths.reduce((s, p) => s + p.conversionValue, 0)
}

/** Per-channel credit range across every model, widest disagreement first.
 *
 * The ordering is the argument: the channels most contested by the choice of
 * model are the ones a reader has to resolve before trusting any budget split. */
export function attributionSpread(
  models: Record<AttributionModel, ChannelCredit[]>,
  totalRevenue: number,
): ChannelSpread[] {
  // Union across models, not just one of them — a channel that only ever appears
  // mid-path still earns nothing under first/last click, and dropping it would
  // hide the very channels this view exists to surface.
  const channels = new Set<string>()
  for (const model of ATTRIBUTION_MODELS) {
    for (const c of models[model] ?? []) channels.add(c.channel)
  }

  return [...channels]
    .map((channel) => {
      const byModel = {} as Record<AttributionModel, number>
      for (const model of ATTRIBUTION_MODELS) {
        byModel[model] = models[model]?.find((c) => c.channel === channel)?.revenue ?? 0
      }
      const values = ATTRIBUTION_MODELS.map((m) => byModel[m])
      const min = Math.min(...values)
      const max = Math.max(...values)
      const swing = round2(max - min)
      return {
        channel,
        byModel,
        min,
        max,
        swing,
        swingShare: totalRevenue > 0 ? swing / totalRevenue : 0,
      }
    })
    .sort((a, b) => b.swing - a.swing || b.max - a.max)
}

export interface ChannelRole {
  channel: string
  /** Paths this channel opened (first touch) — what first-click pays for. */
  opens: number
  /** Paths it closed (last touch) — what last-click pays for. */
  closes: number
  /** Paths it appears in at all, however many times it was touched. */
  paths: number
}

/** How each channel sits in the funnel, which is *why* the models disagree about it.
 *
 * A channel that opens paths and never closes them is worth nothing to last-click
 * and everything to first-click; stating the two counts next to the swing turns the
 * spread from a curiosity into an explanation. */
export function channelRoles(paths: ConversionPath[]): Record<string, ChannelRole> {
  const out: Record<string, ChannelRole> = {}
  const role = (channel: string) =>
    (out[channel] ??= { channel, opens: 0, closes: 0, paths: 0 })

  for (const path of paths) {
    const ordered = [...path.touchpoints].sort((a, b) => a.order - b.order)
    if (ordered.length === 0) continue
    role(ordered[0]!.channel).opens += 1
    role(ordered[ordered.length - 1]!.channel).closes += 1
    // Counted once per path, not once per touch: "in 3 paths" is the honest
    // denominator when a path touches the same channel twice (p2, p7, p10 do).
    for (const channel of new Set(ordered.map((t) => t.channel))) role(channel).paths += 1
  }
  return out
}
