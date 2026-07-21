/**
 * Real logic — ported from apps/web/lib/logic/creative-fatigue.ts
 * Section 7.4.2 — Creative Fatigue Detector.
 */
export interface CreativePerformance {
  name: string;
  frequency: number;
  ctrThisWeek: number;
  ctrLastWeek: number;
  hoursSinceLaunch: number;
}

export type FatigueStatus = "fatigued" | "at-risk" | "healthy";

export interface FatigueResult extends CreativePerformance {
  ctrDeclinePercent: number;
  status: FatigueStatus;
  message: string;
}

const FREQUENCY_THRESHOLD = 3;
const CTR_DECLINE_THRESHOLD = 20;
const ALERT_WINDOW_HOURS = 72;

export function detectFatigue(c: CreativePerformance): FatigueResult {
  const ctrDeclinePercent = c.ctrLastWeek > 0 ? ((c.ctrLastWeek - c.ctrThisWeek) / c.ctrLastWeek) * 100 : 0;
  const frequencyBreach = c.frequency > FREQUENCY_THRESHOLD;
  const ctrBreach = ctrDeclinePercent > CTR_DECLINE_THRESHOLD;
  const pastAlertWindow = c.hoursSinceLaunch >= ALERT_WINDOW_HOURS;

  let status: FatigueStatus = "healthy";
  let message = "Performing within normal range.";

  if (frequencyBreach && ctrBreach) {
    status = "fatigued";
    message = `Frequency ${c.frequency.toFixed(1)} and CTR down ${ctrDeclinePercent.toFixed(0)}% — refresh creative now.`;
  } else if ((frequencyBreach || ctrBreach) && pastAlertWindow) {
    status = "at-risk";
    message = frequencyBreach
      ? `Frequency ${c.frequency.toFixed(1)} exceeds threshold — approaching fatigue.`
      : `CTR down ${ctrDeclinePercent.toFixed(0)}% week-over-week — monitor closely.`;
  }

  return { ...c, ctrDeclinePercent, status, message };
}
