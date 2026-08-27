import type { GrowthHubResponse } from "@growthos/types";

/**
 * A 30-day series whose values sum to roughly `total`, with a sine swing of `amplitude` and a
 * per-metric `phase` so no two sparklines trace the same shape. Deterministic — no Math.random,
 * so the offline dashboard looks the same on every render.
 */
function series(total: number, amplitude: number, phase: number): number[] {
  const mean = total / 30;
  return Array.from({ length: 30 }, (_, i) =>
    Math.round(mean * (1 + Math.sin(i / 3.2 + phase) * amplitude + (i / 30) * 0.12))
  );
}

/**
 * Offline fallback for the Growth Hub, in the exact shape the API returns — so `liveOrMock` swaps
 * one for the other with no branching downstream and the formatting/delta code is exercised
 * identically either way. Numbers are the same order of magnitude as a seeded workspace.
 */
export const growthHubMock: GrowthHubResponse = {
  windowDays: 30,
  metrics: {
    revenue: { current: 48290, previous: 40720 },
    googleSpend: { current: 6200, previous: 5840 },
    metaSpend: { current: 4980, previous: 4690 },
    organicClicks: { current: 128400, previous: 111000 },
    conversions: { current: 6142, previous: 4933 },
  },
  // Deterministic 30-point series for the tile sparklines. Generated rather than hand-listed so a
  // window-length change doesn't leave four arrays quietly out of step with `metrics`.
  daily: {
    revenue: series(48_290, 0.16, 1.1),
    adSpend: series(11_180, 0.09, 2.3),
    conversions: series(6_142, 0.14, 0.4),
    organicClicks: series(128_400, 0.11, 3.7),
  },
  window: { from: "2026-06-18", to: "2026-07-17" },
  dataFrom: "2026-01-19",
  dataThrough: "2026-07-17",
  channels: {
    seo: { organicClicks: 128400 },
    google: { conversions: 1842 },
    meta: { conversions: 2116 },
  },
  baseline: {
    currentConversionRate: 0.0246,
    currentAOV: 78.6,
    currentSessions: 249_600,
  },
};
