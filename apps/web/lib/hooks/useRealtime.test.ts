import { describe, it, expect } from "vitest";
import { planForEvent } from "./useRealtime";

const WS = "ws-42";

describe("planForEvent", () => {
  it("job:complete refreshes all workspace-scoped caches, no toast", () => {
    const plan = planForEvent({ type: "job:complete", jobId: "j", workspaceId: WS }, WS);
    expect(plan.invalidateWorkspace).toBe(true);
    expect(plan.toast).toBeUndefined();
  });

  it("recommendation:new invalidates the queue + hub and toasts once", () => {
    const plan = planForEvent(
      { type: "recommendation:new", workspaceId: WS, recommendationId: "r1" },
      WS
    );
    expect(plan.keys).toContainEqual(["recommendations", WS]);
    expect(plan.keys).toContainEqual(["growth-hub", WS]);
    expect(plan.toast).toBeTruthy();
    expect(plan.toastId).toBe(`rec-new-${WS}`);
  });

  it("meta:fatigue_alert refreshes fatigue + recommendations", () => {
    const plan = planForEvent(
      { type: "meta:fatigue_alert", workspaceId: WS, adSetId: "Creative A" },
      WS
    );
    expect(plan.keys).toContainEqual(["fatigue", WS]);
    expect(plan.keys).toContainEqual(["recommendations", WS]);
  });

  it("analytics:mer_alert refreshes MER with a stable toast id", () => {
    const plan = planForEvent({ type: "analytics:mer_alert", workspaceId: WS }, WS);
    expect(plan.keys).toEqual([["mer", WS]]);
    expect(plan.toastId).toBe(`mer-${WS}`);
  });

  it("report:ready refreshes the intelligence report with a stable toast id", () => {
    const plan = planForEvent(
      { type: "report:ready", workspaceId: WS, periodStart: "2026-07-17" },
      WS
    );
    expect(plan.keys).toContainEqual(["intelligence-report", WS]);
    expect(plan.toastId).toBe(`report-${WS}`);
  });
});
