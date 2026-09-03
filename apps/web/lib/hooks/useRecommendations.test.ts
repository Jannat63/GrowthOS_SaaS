import { describe, expect, it } from "vitest";
import { buildOfflineQueue } from "./useRecommendations";

describe("buildOfflineQueue", () => {
  const queue = buildOfflineQueue("ws-1");

  it("never lists the same job twice", () => {
    // The bug this guards: the cross-channel engine's GoogleAds->SEO rule and the paid-to-organic
    // generator both read the same analysed search terms and emit the identical title, so the queue
    // showed three jobs twice at two different priorities (90/100, 90/78, 90/48).
    const titles = queue.map((r) => r.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("keeps the specialised row, not the cross-channel one, when both cover a term", () => {
    const seo = queue.filter((r) => r.title.startsWith("Create SEO content for"));
    expect(seo.length).toBeGreaterThan(0);
    // The specialised generator scores impact from real conversion data and carries a linked
    // content brief; the cross-channel copy has a flat bucket score and no brief.
    for (const r of seo) expect(r.type).toBe("paid_to_organic");
  });

  it("runs all four generators, so the offline queue is the same queue the API builds", () => {
    const types = new Set(queue.map((r) => r.type));
    expect(types).toEqual(
      new Set(["cross_channel", "paid_to_organic", "organic_to_paid", "fatigue_alert"])
    );
  });

  it("carries the action verb the specialised generators set", () => {
    const labels = new Set(queue.map((r) => r.actionLabel).filter(Boolean));
    expect(labels).toContain("Generate brief");
    expect(labels).toContain("Generate creative");
    expect(labels).toContain("Refresh creative");
  });

  it("orders deterministically: priority down, then cheapest, then id", () => {
    for (let i = 1; i < queue.length; i++) {
      const a = queue[i - 1]!;
      const b = queue[i]!;
      const ordered =
        a.compositeScore > b.compositeScore ||
        (a.compositeScore === b.compositeScore && a.effortScore < b.effortScore) ||
        (a.compositeScore === b.compositeScore &&
          a.effortScore === b.effortScore &&
          a.id.localeCompare(b.id) <= 0);
      expect(ordered, `${a.title} should not precede ${b.title}`).toBe(true);
    }
    // Same input, same output — the queue must not reshuffle between two loads.
    expect(buildOfflineQueue("ws-1").map((r) => r.id)).toEqual(queue.map((r) => r.id));
  });

  it("gives every row the bridge the page renders", () => {
    for (const r of queue) {
      expect(r.sourceChannel).toBeTruthy();
      expect(r.targetChannel).toBeTruthy();
    }
  });
});
