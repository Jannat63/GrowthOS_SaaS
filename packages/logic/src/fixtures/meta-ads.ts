import type { CreativePerformance } from "../engines/creative-fatigue.js";
import type { CampaignInput } from "../engines/google-ads-advisor.js";

/** Ported from legacy — Meta ad creatives the fatigue engine evaluates. */
export const creatives: CreativePerformance[] = [
  { name: "Modern Chair — Offer Ad", frequency: 4.2, ctrThisWeek: 1.8, ctrLastWeek: 2.6, hoursSinceLaunch: 96 },
  { name: "Living Room Collection", frequency: 2.1, ctrThisWeek: 2.4, ctrLastWeek: 2.5, hoursSinceLaunch: 48 },
  { name: "Dining Set — Special", frequency: 3.6, ctrThisWeek: 1.9, ctrLastWeek: 2.3, hoursSinceLaunch: 80 },
  { name: "Bedroom Set — Sale", frequency: 1.4, ctrThisWeek: 3.1, ctrLastWeek: 3.0, hoursSinceLaunch: 30 },
  // Added for the creative scorecard (M4 P4.2a-2). The scorecard needs at least 5 creatives before
  // a self-median is a reference rather than noise, and this list held exactly 4 — so every
  // demonstration workspace would have shown "insufficient data" on every creative and the feature
  // would have read as broken.
  //
  // The fixture was widened rather than the threshold lowered. The threshold is a statistical
  // judgement about when a median means anything; tuning it to fit demo data would be backwards,
  // and would produce exactly the confident-looking verdict over too-thin evidence that
  // AUDIT-2026-08-13-codebase.md #14 warns about. A demo dataset too small to demonstrate the
  // feature is a deficient fixture.
  //
  // Sits near the middle of the CTR spread on purpose, so the seeded account yields one
  // underperforming creative, one strong, and the rest average — the feature's full range.
  { name: "Office Chair — Bundle", frequency: 2.8, ctrThisWeek: 2.2, ctrLastWeek: 2.35, hoursSinceLaunch: 60 },
];

/** Meta Ads campaigns for the advisor engine (mock fallback). Varied on purpose — a scaling
 * prospecting campaign, healthy retargeting, and an underperforming broad campaign. */
export const metaCampaigns: CampaignInput[] = [
  { id: "m-retarget", name: "Retargeting - Cart Abandoners", clicks: 640, conversions: 88, cost: 910.4, conversionValue: 5240 },
  { id: "m-lookalike", name: "Prospecting - Lookalike 1%", clicks: 1820, conversions: 96, cost: 2410.0, conversionValue: 6300 },
  { id: "m-interest", name: "Prospecting - Interest Stack", clicks: 1240, conversions: 41, cost: 1680.5, conversionValue: 2210 },
  { id: "m-broad", name: "Advantage+ - Broad", clicks: 720, conversions: 3, cost: 690.2, conversionValue: 140 },
];
