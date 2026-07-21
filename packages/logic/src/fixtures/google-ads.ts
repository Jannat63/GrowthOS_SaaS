import type { SearchTerm } from "../engines/search-terms-bridge.js";
import type { CampaignInput } from "../engines/google-ads-advisor.js";

/** Ported from legacy — Google Ads search terms the bridge engine analyzes. */
export const searchTerms: SearchTerm[] = [
  { term: "best office chair for back pain", clicks: 412, conversions: 38, cost: 612.4, organicPosition: null },
  { term: "office chair", clicks: 890, conversions: 62, cost: 1240.1, organicPosition: 6 },
  { term: "ergonomic chair for home office", clicks: 210, conversions: 19, cost: 305.2, organicPosition: null },
  { term: "sofa collection", clicks: 340, conversions: 28, cost: 490.0, organicPosition: 3 },
  { term: "gaming chair rgb", clicks: 155, conversions: 4, cost: 210.6, organicPosition: 21 },
];

/** Google Ads campaigns for the advisor engine (mock fallback + tests). Varied on purpose so the
 * advisor surfaces a scale, a healthy, and a couple of wasted/low-quality campaigns. */
export const adCampaigns: CampaignInput[] = [
  { id: "g-brand", name: "Search - Brand", clicks: 1240, conversions: 168, cost: 1820.5, conversionValue: 9820, qualityScore: 9 },
  { id: "g-category", name: "Search - Ergonomic Chairs", clicks: 860, conversions: 74, cost: 1610.2, conversionValue: 4120, qualityScore: 7 },
  { id: "g-pmax", name: "Performance Max - Catalog", clicks: 2100, conversions: 96, cost: 2410.0, conversionValue: 5900, qualityScore: 6 },
  { id: "g-broad", name: "Search - Broad Furniture", clicks: 540, conversions: 0, cost: 640.75, conversionValue: 0, qualityScore: 4 },
  { id: "g-display", name: "Display - Remarketing", clicks: 980, conversions: 6, cost: 410.3, conversionValue: 180, qualityScore: 2 },
];
