import type { ConversionPath } from "../engines/attribution.js";

/** Sample multi-touch conversion paths for the attribution comparison (mock fallback + seed shape).
 * Varied on purpose: SEO/organic frequently open paths, paid usually closes — so different models
 * shift credit between top-of-funnel and closing channels. */
export const conversionPaths: ConversionPath[] = [
  { id: "p1", conversionValue: 120, touchpoints: [{ channel: "seo", order: 0 }, { channel: "google_ads", order: 1 }, { channel: "meta_ads", order: 2 }] },
  { id: "p2", conversionValue: 90, touchpoints: [{ channel: "meta_ads", order: 0 }, { channel: "meta_ads", order: 1 }, { channel: "google_ads", order: 2 }] },
  { id: "p3", conversionValue: 240, touchpoints: [{ channel: "organic", order: 0 }, { channel: "email", order: 1 }, { channel: "google_ads", order: 2 }] },
  { id: "p4", conversionValue: 60, touchpoints: [{ channel: "google_ads", order: 0 }] },
  { id: "p5", conversionValue: 310, touchpoints: [{ channel: "seo", order: 0 }, { channel: "organic", order: 1 }, { channel: "email", order: 2 }, { channel: "meta_ads", order: 3 }] },
  { id: "p6", conversionValue: 150, touchpoints: [{ channel: "meta_ads", order: 0 }, { channel: "google_ads", order: 1 }] },
  { id: "p7", conversionValue: 80, touchpoints: [{ channel: "organic", order: 0 }, { channel: "organic", order: 1 }] },
  { id: "p8", conversionValue: 200, touchpoints: [{ channel: "seo", order: 0 }, { channel: "google_ads", order: 1 }, { channel: "email", order: 2 }] },
  { id: "p9", conversionValue: 175, touchpoints: [{ channel: "google_ads", order: 0 }, { channel: "meta_ads", order: 1 }] },
  { id: "p10", conversionValue: 130, touchpoints: [{ channel: "email", order: 0 }, { channel: "meta_ads", order: 1 }, { channel: "meta_ads", order: 2 }] },
];
