import type { GrowthHubResponse } from "@growthos/types";

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
