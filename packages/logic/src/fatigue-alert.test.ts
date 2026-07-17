import { describe, it, expect } from "vitest";
import { fatigueAlertRecommendation } from "./fatigue-alert.js";
import { detectFatigue } from "./engines/creative-fatigue.js";

describe("fatigueAlertRecommendation", () => {
  it("maps a fatigued creative to a high-urgency fatigue_alert", () => {
    const f = detectFatigue({
      name: "Offer Ad", frequency: 4.2, ctrThisWeek: 1.8, ctrLastWeek: 2.6, hoursSinceLaunch: 96,
    });
    expect(f.status).toBe("fatigued");
    const r = fatigueAlertRecommendation(f, "ws1");
    expect(r.type).toBe("fatigue_alert");
    expect(r.sourceChannel).toBe("meta_ads");
    expect(r.urgencyScore).toBeGreaterThanOrEqual(80);
    expect(r.compositeScore).toBeGreaterThan(0);
  });
});
