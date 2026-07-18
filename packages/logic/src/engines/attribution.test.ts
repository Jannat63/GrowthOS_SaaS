import { describe, expect, it } from "vitest";
import {
  attribute,
  attributeAll,
  modelWeights,
  ATTRIBUTION_MODELS,
  type ConversionPath,
} from "./attribution.js";

const paths: ConversionPath[] = [
  {
    id: "c1",
    conversionValue: 100,
    touchpoints: [
      { channel: "seo", order: 0 },
      { channel: "google_ads", order: 1 },
      { channel: "meta_ads", order: 2 },
    ],
  },
  {
    id: "c2",
    conversionValue: 200,
    touchpoints: [
      { channel: "meta_ads", order: 0 },
      { channel: "google_ads", order: 1 },
    ],
  },
];

const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);

describe("attribution weights", () => {
  it("every model's weights sum to 1 for any path length", () => {
    for (const model of ATTRIBUTION_MODELS) {
      for (const n of [1, 2, 3, 5]) {
        expect(sum(modelWeights(model, n))).toBeCloseTo(1, 6);
      }
    }
  });

  it("last-click gives all credit to the final touch", () => {
    expect(modelWeights("last_click", 3)).toEqual([0, 0, 1]);
  });

  it("first-click gives all credit to the first touch", () => {
    expect(modelWeights("first_click", 3)).toEqual([1, 0, 0]);
  });

  it("linear splits evenly", () => {
    expect(modelWeights("linear", 4)).toEqual([0.25, 0.25, 0.25, 0.25]);
  });

  it("time-decay weights later touches more", () => {
    const w = modelWeights("time_decay", 3);
    expect(w[2]).toBeGreaterThan(w[1]!);
    expect(w[1]).toBeGreaterThan(w[0]!);
  });

  it("position-based is 40/20/40", () => {
    expect(modelWeights("position_based", 3)).toEqual([0.4, 0.2, 0.4]);
  });
});

describe("attribute", () => {
  it("last-click credits the converting channel", () => {
    const credit = attribute(paths, "last_click");
    const byChannel = Object.fromEntries(credit.map((c) => [c.channel, c]));
    // c1 last touch = meta_ads ($100), c2 last touch = google_ads ($200).
    expect(byChannel["meta_ads"]!.revenue).toBe(100);
    expect(byChannel["google_ads"]!.revenue).toBe(200);
    // seo was a touchpoint but got no last-click credit — kept at 0 so the channel set stays
    // consistent across models in the comparison view.
    expect(byChannel["seo"]!.revenue).toBe(0);
  });

  it("conserves total revenue across channels for every model", () => {
    const totalValue = paths.reduce((s, p) => s + p.conversionValue, 0); // 300
    for (const model of ATTRIBUTION_MODELS) {
      const credit = attribute(paths, model);
      expect(credit.reduce((s, c) => s + c.revenue, 0)).toBeCloseTo(totalValue, 1);
    }
  });

  it("attributeAll returns a result set per model, sorted by revenue", () => {
    const all = attributeAll(paths);
    expect(Object.keys(all).sort()).toEqual([...ATTRIBUTION_MODELS].sort());
    for (const credit of Object.values(all)) {
      for (let i = 1; i < credit.length; i++) {
        expect(credit[i - 1]!.revenue).toBeGreaterThanOrEqual(credit[i]!.revenue);
      }
    }
  });
});
