import { describe, it, expect } from "vitest";
import { clusterKeywords, type ClusterValidator } from "./keyword-clustering.js";

/** Names in the order the engine returned them, for order-insensitive comparison of the grouping. */
const groupsOf = (keywords: string[], opts?: Parameters<typeof clusterKeywords>[1]) =>
  clusterKeywords(keywords, opts)
    .map((c) => [...c.keywords].sort())
    .sort((a, b) => a[0]!.localeCompare(b[0]!));

describe("clusterKeywords", () => {
  // The legacy docstring's own example, kept verbatim as the regression case for the port.
  it("groups the office-chair variants while keeping dining table separate", () => {
    const clusters = clusterKeywords([
      "office chair",
      "ergonomic office chair",
      "best office chair",
      "dining table",
    ]);

    expect(clusters).toHaveLength(2);

    const chairs = clusters.find((c) => c.keywords.includes("office chair"));
    expect(chairs?.keywords.sort()).toEqual([
      "best office chair",
      "ergonomic office chair",
      "office chair",
    ]);

    const table = clusters.find((c) => c.keywords.includes("dining table"));
    expect(table?.keywords).toEqual(["dining table"]);
  });

  // The fix for the legacy algorithm's order-dependence: it seeded clusters from the input list, so
  // the same keyword set in a different order produced different clusters.
  it("produces identical clusters under shuffled input", () => {
    const keywords = [
      "office chair",
      "ergonomic office chair",
      "best office chair",
      "dining table",
      "round dining table",
      "standing desk",
    ];
    const shuffled = [
      "round dining table",
      "best office chair",
      "standing desk",
      "office chair",
      "dining table",
      "ergonomic office chair",
    ];

    expect(groupsOf(shuffled)).toEqual(groupsOf(keywords));
  });

  it("names a cluster after its most common significant token", () => {
    const [cluster] = clusterKeywords(["office chair", "ergonomic office chair", "office chair mat"]);
    // "office" appears in all three; "chair" in two.
    expect(cluster?.clusterName).toBe("Office");
  });

  it("breaks naming ties deterministically rather than by insertion order", () => {
    // "alpha" and "bravo" both appear twice. The tie breaks on length (equal), then alphabetically.
    const forward = clusterKeywords(["alpha bravo", "alpha bravo charlie"]);
    const reversed = clusterKeywords(["alpha bravo charlie", "alpha bravo"]);

    expect(forward[0]?.clusterName).toBe("Alpha");
    expect(reversed[0]?.clusterName).toBe("Alpha");
  });

  it("never returns two clusters with the same name", () => {
    // The shipped seed keywords produced two clusters both called "Office" before names were
    // de-duplicated: the office-chair pair, and "home office ideas" on its own.
    const clusters = clusterKeywords([
      "best office chair for back pain",
      "office chair lumbar support",
      "home office ideas",
    ]);

    const names = clusters.map((c) => c.clusterName);
    expect(new Set(names).size).toBe(names.length);
    // Disambiguated by widening to the next-most-common token, not by a numeric suffix.
    expect(names).toContain("Office");
    expect(names.some((n) => n.startsWith("Office ") && n !== "Office")).toBe(true);
  });

  it("ignores stopwords when measuring similarity", () => {
    // Both reduce to {running, shoes} once "best"/"the"/"for" are dropped, so they must group even
    // though their raw word sets overlap far less.
    const clusters = clusterKeywords(["best running shoes", "the running shoes"]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.keywords.sort()).toEqual(["best running shoes", "the running shoes"]);
  });

  it("keeps keywords apart when they share no significant words", () => {
    const clusters = clusterKeywords(["office chair", "running shoes", "dining table"]);
    expect(clusters).toHaveLength(3);
  });

  describe("threshold", () => {
    // "office chair mat" vs "office chair" is {office,chair,mat} vs {office,chair}: 2/3 = 0.67.
    const pair = ["office chair", "office chair mat"];

    it("groups a pair at or below its similarity", () => {
      expect(clusterKeywords(pair, { threshold: 0.66 })).toHaveLength(1);
    });

    it("separates the same pair once the threshold exceeds it", () => {
      expect(clusterKeywords(pair, { threshold: 0.7 })).toHaveLength(2);
    });
  });

  describe("degenerate input", () => {
    it("returns nothing for an empty list", () => {
      expect(clusterKeywords([])).toEqual([]);
    });

    it("returns a single cluster for a single keyword", () => {
      const clusters = clusterKeywords(["office chair"]);
      expect(clusters).toHaveLength(1);
      expect(clusters[0]?.keywords).toEqual(["office chair"]);
    });

    it("collapses duplicates instead of padding a cluster with them", () => {
      const clusters = clusterKeywords(["office chair", "office chair", "office chair"]);
      expect(clusters).toHaveLength(1);
      expect(clusters[0]?.keywords).toEqual(["office chair"]);
    });

    it("falls back to the keyword itself when every token is a stopword", () => {
      const clusters = clusterKeywords(["the best"]);
      expect(clusters[0]?.clusterName).toBe("the best");
    });
  });

  describe("intent verification", () => {
    it("marks clusters unverified when no validator is supplied", () => {
      const clusters = clusterKeywords(["office chair", "ergonomic office chair"]);
      expect(clusters.every((c) => c.intentVerified)).toBe(false);
    });

    it("lets a validator split a lexical cluster that mixes intents", () => {
      // The engine's documented blind spot: these share {running, shoes} once "best" is dropped, so
      // lexically they are one cluster — and they serve completely different intents. This is the
      // seam the SERP-overlap pass plugs into when DataForSEO lands.
      const keywords = ["best running shoes", "how to clean running shoes"];
      expect(clusterKeywords(keywords)).toHaveLength(1);

      const byIntent: ClusterValidator = (members) => [
        members.filter((k) => k.startsWith("how to")),
        members.filter((k) => !k.startsWith("how to")),
      ];

      const clusters = clusterKeywords(keywords, { validator: byIntent });
      expect(clusters).toHaveLength(2);
      expect(clusters.every((c) => c.intentVerified)).toBe(true);
      expect(groupsOf(keywords, { validator: byIntent })).toEqual([
        ["best running shoes"],
        ["how to clean running shoes"],
      ]);
    });

    it("drops empty groups a validator returns rather than emitting an empty cluster", () => {
      const dropsEverythingIntoOne: ClusterValidator = (members) => [members, []];
      const clusters = clusterKeywords(["office chair", "ergonomic office chair"], {
        validator: dropsEverythingIntoOne,
      });
      expect(clusters).toHaveLength(1);
      expect(clusters[0]?.keywords).toHaveLength(2);
    });
  });
});
