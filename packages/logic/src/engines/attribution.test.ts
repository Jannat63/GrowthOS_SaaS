import { describe, expect, it } from "vitest";
import {
  attribute,
  attributeAll,
  attributionSpread,
  channelRoles,
  modelWeights,
  pathsRevenue,
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

describe("attribution spread", () => {
  const models = attributeAll(paths);
  const total = pathsRevenue(paths);

  it("totals the paths, not the rounded per-channel credits", () => {
    expect(total).toBe(300);
    // Summing linear's credits lands on 300.00999… over the seeded fixture; the
    // spread's denominator must not inherit that drift.
    expect(pathsRevenue([])).toBe(0);
  });

  it("orders channels by widest disagreement first", () => {
    const spread = attributionSpread(models, total);
    for (let i = 1; i < spread.length; i++) {
      expect(spread[i - 1]!.swing).toBeGreaterThanOrEqual(spread[i]!.swing);
    }
  });

  it("swing is the distance between the most and least generous model", () => {
    const seo = attributionSpread(models, total).find((s) => s.channel === "seo")!;
    // seo opens c1 ($100) and never closes: everything under first-click, nothing
    // under last-click.
    expect(seo.byModel.first_click).toBe(100);
    expect(seo.byModel.last_click).toBe(0);
    expect(seo.swing).toBe(100);
    expect(seo.swingShare).toBeCloseTo(100 / 300, 6);
  });

  it("keeps a channel that earns nothing under some model", () => {
    const spread = attributionSpread(models, total);
    expect(spread.map((s) => s.channel).sort()).toEqual(["google_ads", "meta_ads", "seo"]);
    expect(spread.every((s) => s.min <= s.max)).toBe(true);
  });

  it("reports no swing when every model agrees", () => {
    // A single-touch path gives that channel 100% under every model.
    const solo = attributeAll([{ id: "s", conversionValue: 50, touchpoints: [{ channel: "email", order: 0 }] }]);
    const [spread] = attributionSpread(solo, 50);
    expect(spread!.swing).toBe(0);
    expect(spread!.swingShare).toBe(0);
    expect(spread!.min).toBe(50);
  });

  it("divides by nothing safely when there is no revenue", () => {
    const free = attributeAll([{ id: "z", conversionValue: 0, touchpoints: [{ channel: "seo", order: 0 }] }]);
    expect(attributionSpread(free, 0)[0]!.swingShare).toBe(0);
  });
});

describe("channel roles", () => {
  it("counts openers and closers separately", () => {
    const roles = channelRoles(paths);
    expect(roles.seo).toMatchObject({ opens: 1, closes: 0, paths: 1 });
    expect(roles.meta_ads).toMatchObject({ opens: 1, closes: 1, paths: 2 });
    expect(roles.google_ads).toMatchObject({ opens: 0, closes: 1, paths: 2 });
  });

  it("counts a repeated channel once per path", () => {
    const roles = channelRoles([
      {
        id: "r",
        conversionValue: 10,
        touchpoints: [
          { channel: "meta_ads", order: 0 },
          { channel: "meta_ads", order: 1 },
        ],
      },
    ]);
    expect(roles.meta_ads).toMatchObject({ opens: 1, closes: 1, paths: 1 });
  });

  it("reads touch order rather than array order", () => {
    const roles = channelRoles([
      {
        id: "u",
        conversionValue: 10,
        touchpoints: [
          { channel: "google_ads", order: 2 },
          { channel: "seo", order: 0 },
          { channel: "email", order: 1 },
        ],
      },
    ]);
    expect(roles.seo!.opens).toBe(1);
    expect(roles.google_ads!.closes).toBe(1);
    expect(roles.email).toMatchObject({ opens: 0, closes: 0, paths: 1 });
  });
});
