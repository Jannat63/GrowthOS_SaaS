import { describe, it, expect } from "vitest";
import {
  planActions,
  requiresPreviousValue,
  targetKey,
  type AutomationRule,
  type PlannerSignals,
} from "./automation-planner.js";
import type { CampaignInsight } from "./google-ads-advisor.js";
import type { FatigueResult } from "./creative-fatigue.js";
import type { AnalyzedSearchTerm } from "./search-terms-bridge.js";

const campaign = (over: Partial<CampaignInsight>): CampaignInsight => ({
  id: "c-1",
  name: "Search - Brand",
  clicks: 100,
  conversions: 0,
  cost: 500,
  conversionValue: 0,
  cpa: 0,
  roas: 0,
  conversionRate: 0,
  status: "wasted",
  recommendation: "",
  ...over,
});

const creative = (over: Partial<FatigueResult>): FatigueResult => ({
  name: "Creative A",
  frequency: 4.2,
  ctrThisWeek: 0.8,
  ctrLastWeek: 1.6,
  hoursSinceLaunch: 200,
  ctrDeclinePercent: 50,
  status: "fatigued",
  message: "",
  ...over,
});

const term = (over: Partial<AnalyzedSearchTerm>): AnalyzedSearchTerm => ({
  term: "ergonomic desk setup",
  clicks: 80,
  conversions: 4,
  cost: 220,
  organicPosition: null,
  conversionRate: 0.05,
  recommendation: { type: "paid-proven-organic-needed", message: "" },
  ...over,
});

const rule = (over: Partial<AutomationRule>): AutomationRule => ({
  actionType: "pause_campaign",
  enabled: true,
  mode: "suggest",
  ...over,
});

describe("planActions", () => {
  it("proposes nothing when every rule is disabled, however loud the signals", () => {
    const signals: PlannerSignals = { googleCampaigns: [campaign({})], creatives: [creative({})] };
    const rules = [
      rule({ actionType: "pause_campaign", enabled: false }),
      rule({ actionType: "refresh_creative", enabled: false }),
    ];
    expect(planActions(signals, rules)).toEqual([]);
  });

  describe("pause_campaign", () => {
    it("pauses a wasted campaign over the spend threshold and records what it overwrites", () => {
      const [action] = planActions({ googleCampaigns: [campaign({ cost: 500 })] }, [rule({})]);

      expect(action!.actionType).toBe("pause_campaign");
      expect(action!.target).toMatchObject({ platform: "google_ads", campaignId: "c-1" });
      expect(action!.payload).toEqual({ status: "PAUSED" });
      // Reversibility: the pause must know what it is turning off.
      expect(action!.previousValue).toMatchObject({ status: "ENABLED", cost: 500 });
      expect(action!.reason).toContain("no conversions");
    });

    it("leaves a wasted campaign alone when its spend is under the threshold", () => {
      const signals = { googleCampaigns: [campaign({ cost: 30 })] };
      expect(planActions(signals, [rule({ threshold: { minWastedSpend: 50 } })])).toEqual([]);
    });

    it("ignores healthy and scale campaigns entirely", () => {
      const signals = {
        googleCampaigns: [campaign({ status: "healthy" }), campaign({ id: "c-2", status: "scale" })],
      };
      expect(planActions(signals, [rule({})])).toEqual([]);
    });

    it("covers both platforms from one rule", () => {
      const actions = planActions(
        {
          googleCampaigns: [campaign({ id: "g-1" })],
          metaCampaigns: [campaign({ id: "m-1" })],
        },
        [rule({})],
      );
      expect(actions.map((a) => a.target.platform)).toEqual(["google_ads", "meta_ads"]);
    });
  });

  describe("adjust_budget", () => {
    const scaling = campaign({ status: "scale", roas: 5, cost: 1000, conversions: 40 });

    it("raises budget on a high-ROAS campaign by the configured percentage", () => {
      const [action] = planActions({ googleCampaigns: [scaling] }, [
        rule({ actionType: "adjust_budget", threshold: { budgetIncreasePercent: 15 } }),
      ]);
      expect(action!.payload).toEqual({ changePercent: 15, newSpendEstimate: 1150 });
      expect(action!.previousValue).toMatchObject({ cost: 1000, roas: 5 });
    });

    it("clamps the increase to the cap at planning time, so the queue shows the real number", () => {
      const [action] = planActions({ googleCampaigns: [scaling] }, [
        rule({
          actionType: "adjust_budget",
          threshold: { budgetIncreasePercent: 200 },
          caps: { maxChangePercent: 20 },
        }),
      ]);
      expect(action!.payload).toMatchObject({ changePercent: 20 });
    });

    it("defaults to a 20% ceiling when no cap is configured", () => {
      const [action] = planActions({ googleCampaigns: [scaling] }, [
        rule({ actionType: "adjust_budget", threshold: { budgetIncreasePercent: 500 } }),
      ]);
      expect(action!.payload).toMatchObject({ changePercent: 20 });
    });

    it("proposes nothing when the cap leaves no room to move", () => {
      const actions = planActions({ googleCampaigns: [scaling] }, [
        rule({ actionType: "adjust_budget", caps: { maxChangePercent: 0 } }),
      ]);
      expect(actions).toEqual([]);
    });

    it("skips a scaling campaign below the ROAS floor", () => {
      const actions = planActions({ googleCampaigns: [campaign({ status: "scale", roas: 1.2 })] }, [
        rule({ actionType: "adjust_budget", threshold: { minRoas: 3 } }),
      ]);
      expect(actions).toEqual([]);
    });
  });

  describe("refresh_creative", () => {
    it("proposes a refresh only for fatigued creatives, not at-risk ones", () => {
      const actions = planActions(
        { creatives: [creative({}), creative({ name: "Creative B", status: "at-risk" })] },
        [rule({ actionType: "refresh_creative" })],
      );
      expect(actions).toHaveLength(1);
      expect(actions[0]!.target.creativeName).toBe("Creative A");
      expect(actions[0]!.previousValue).toMatchObject({ ctrThisWeek: 0.8 });
    });
  });

  describe("queue_content", () => {
    it("queues a converting term with no organic coverage, and carries no previousValue", () => {
      const [action] = planActions({ searchTerms: [term({})] }, [
        rule({ actionType: "queue_content" }),
      ]);
      expect(action!.target).toMatchObject({ platform: "content", keyword: "ergonomic desk setup" });
      // Additive — there is nothing to overwrite, so previousValue is legitimately null.
      expect(action!.previousValue).toBeNull();
      expect(requiresPreviousValue("queue_content")).toBe(false);
    });

    it("skips terms the bridge does not flag as needing organic coverage", () => {
      const covered = term({ recommendation: { type: "monitor", message: "" } });
      expect(planActions({ searchTerms: [covered] }, [rule({ actionType: "queue_content" })])).toEqual([]);
    });

    it("respects the conversion floor", () => {
      const actions = planActions({ searchTerms: [term({ conversions: 1 })] }, [
        rule({ actionType: "queue_content", threshold: { minConversions: 3 } }),
      ]);
      expect(actions).toEqual([]);
    });
  });

  describe("idempotency and caps", () => {
    it("does not stack a second action on a target that already has one open", () => {
      const signals = { googleCampaigns: [campaign({ id: "c-1" })] };
      const openTargetKeys = [targetKey("pause_campaign", { platform: "google_ads", campaignId: "c-1" })];

      expect(planActions(signals, [rule({})], { openTargetKeys })).toEqual([]);
      // ...but an unrelated target is still fair game.
      expect(
        planActions({ googleCampaigns: [campaign({ id: "c-2" })] }, [rule({})], { openTargetKeys }),
      ).toHaveLength(1);
    });

    it("truncates to the remaining daily allowance for that action type", () => {
      const signals = {
        googleCampaigns: [campaign({ id: "a" }), campaign({ id: "b" }), campaign({ id: "c" })],
      };
      const actions = planActions(signals, [rule({ caps: { maxActionsPerDay: 5 } })], {
        proposedTodayByType: { pause_campaign: 3 },
      });
      expect(actions).toHaveLength(2);
    });

    it("proposes nothing once the daily allowance is spent", () => {
      const signals = { googleCampaigns: [campaign({})] };
      const actions = planActions(signals, [rule({ caps: { maxActionsPerDay: 2 } })], {
        proposedTodayByType: { pause_campaign: 2 },
      });
      expect(actions).toEqual([]);
    });
  });

  describe("mode", () => {
    it("marks actions for auto-approval only in auto mode", () => {
      const signals = { googleCampaigns: [campaign({})] };
      expect(planActions(signals, [rule({ mode: "suggest" })])[0]!.autoApprove).toBe(false);
      expect(planActions(signals, [rule({ mode: "auto" })])[0]!.autoApprove).toBe(true);
    });
  });

  it("flags every state-changing action as requiring a previousValue", () => {
    expect(requiresPreviousValue("pause_campaign")).toBe(true);
    expect(requiresPreviousValue("adjust_budget")).toBe(true);
    expect(requiresPreviousValue("refresh_creative")).toBe(true);
  });
});
