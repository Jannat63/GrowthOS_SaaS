import type { CreativePerformance } from "../engines/creative-fatigue.js";

/** Ported from legacy — Meta ad creatives the fatigue engine evaluates. */
export const creatives: CreativePerformance[] = [
  { name: "Modern Chair — Offer Ad", frequency: 4.2, ctrThisWeek: 1.8, ctrLastWeek: 2.6, hoursSinceLaunch: 96 },
  { name: "Living Room Collection", frequency: 2.1, ctrThisWeek: 2.4, ctrLastWeek: 2.5, hoursSinceLaunch: 48 },
  { name: "Dining Set — Special", frequency: 3.6, ctrThisWeek: 1.9, ctrLastWeek: 2.3, hoursSinceLaunch: 80 },
  { name: "Bedroom Set — Sale", frequency: 1.4, ctrThisWeek: 3.1, ctrLastWeek: 3.0, hoursSinceLaunch: 30 },
];
