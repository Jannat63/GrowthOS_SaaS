import type { CreativePerformance } from "../engines/creative-fatigue.js";
import type { CampaignInput } from "../engines/google-ads-advisor.js";

/** Ported from legacy — Meta ad creatives the fatigue engine evaluates. */
export const creatives: CreativePerformance[] = [
  { name: "Modern Chair — Offer Ad", frequency: 4.2, ctrThisWeek: 1.8, ctrLastWeek: 2.6, hoursSinceLaunch: 96 },
  { name: "Living Room Collection", frequency: 2.1, ctrThisWeek: 2.4, ctrLastWeek: 2.5, hoursSinceLaunch: 48 },
  { name: "Dining Set — Special", frequency: 3.6, ctrThisWeek: 1.9, ctrLastWeek: 2.3, hoursSinceLaunch: 80 },
  { name: "Bedroom Set — Sale", frequency: 1.4, ctrThisWeek: 3.1, ctrLastWeek: 3.0, hoursSinceLaunch: 30 },
];

/** Meta Ads campaigns for the advisor engine (mock fallback). Varied on purpose — a scaling
 * prospecting campaign, healthy retargeting, and an underperforming broad campaign. */
export const metaCampaigns: CampaignInput[] = [
  { id: "m-retarget", name: "Retargeting - Cart Abandoners", clicks: 640, conversions: 88, cost: 910.4, conversionValue: 5240 },
  { id: "m-lookalike", name: "Prospecting - Lookalike 1%", clicks: 1820, conversions: 96, cost: 2410.0, conversionValue: 6300 },
  { id: "m-interest", name: "Prospecting - Interest Stack", clicks: 1240, conversions: 41, cost: 1680.5, conversionValue: 2210 },
  { id: "m-broad", name: "Advantage+ - Broad", clicks: 720, conversions: 3, cost: 690.2, conversionValue: 140 },
];
