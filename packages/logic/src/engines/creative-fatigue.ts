// Real logic implementing Section 7.4.2:
// "tracks which ad sets are approaching creative fatigue (frequency > 3,
//  CTR declining > 20% week-over-week)... Alerts at 72 hours."

export interface CreativePerformance {
  name: string;
  frequency: number; // avg times a unique user has seen the ad
  ctrThisWeek: number; // %
  ctrLastWeek: number; // %
  hoursSinceLaunch: number;
}

export type FatigueStatus = "fatigued" | "at-risk" | "healthy";

export interface FatigueResult extends CreativePerformance {
  ctrDeclinePercent: number;
  status: FatigueStatus;
  message: string;
}

/**
 * The three numbers the verdict is made of.
 *
 * Exported because the UI states them: a creative is told it is "at risk" on the strength of these
 * values, and a reader who cannot see the line being crossed has to take the verdict on trust.
 * They were private, so the page hard-coded a description of the rule in its subtitle — and got it
 * wrong, describing the `fatigued` AND while showing rows that qualified on the `at-risk` OR.
 */
export const FATIGUE_THRESHOLDS = {
  /** Average impressions per unique user, above which an audience is over-exposed. */
  frequency: 3,
  /** Week-over-week CTR decline, in percent. */
  ctrDecline: 20,
  /**
   * Hours since launch before the softer `at-risk` rule applies at all. A new creative has not run
   * long enough for one bad signal to mean anything — blueprint §7.4.2, "Alerts at 72 hours".
   */
  alertWindowHours: 72,
} as const;

const FREQUENCY_THRESHOLD = FATIGUE_THRESHOLDS.frequency;
const CTR_DECLINE_THRESHOLD = FATIGUE_THRESHOLDS.ctrDecline;
const ALERT_WINDOW_HOURS = FATIGUE_THRESHOLDS.alertWindowHours;

export function detectFatigue(c: CreativePerformance): FatigueResult {
  const ctrDeclinePercent =
    c.ctrLastWeek > 0 ? ((c.ctrLastWeek - c.ctrThisWeek) / c.ctrLastWeek) * 100 : 0;

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

export function detectFatigueAll(creatives: CreativePerformance[]): FatigueResult[] {
  return creatives.map(detectFatigue).sort((a, b) => {
    const order = { fatigued: 0, "at-risk": 1, healthy: 2 };
    return order[a.status] - order[b.status];
  });
}
