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
