import { describe, it, expect } from "vitest";
import { clusterKeywords } from "./keyword-clustering.js";

describe("clusterKeywords", () => {
  it("groups keywords sharing significant words into the same cluster", () => {
    const clusters = clusterKeywords([
      "best office chair for back pain",
      "ergonomic office chair",
      "office chair with lumbar support",
    ]);
    expect(clusters.length).toBe(1);
    expect(clusters[0]!.keywords).toHaveLength(3);
  });

  it("keeps genuinely unrelated keywords in separate clusters", () => {
    const clusters = clusterKeywords(["office chair", "dining table", "standing desk"]);
    expect(clusters.length).toBe(3);
  });

  it("ignores stopwords when comparing keywords (not a false-positive match on 'best'/'the'/etc)", () => {
    const clusters = clusterKeywords(["best dining table", "best standing desk"]);
    // Both share only the stopword "best" — no genuine topical overlap, so they must NOT merge.
    expect(clusters.length).toBe(2);
  });

  it("names each cluster after its most common significant word", () => {
    const clusters = clusterKeywords([
      "gaming chair rgb",
      "gaming chair cheap",
      "gaming keyboard",
    ]);
    const gamingCluster = clusters.find((c) => c.keywords.length > 1);
    expect(gamingCluster?.clusterName).toBe("Gaming");
  });

  it("is deterministic (same input, same output, every time)", () => {
    const input = ["office chair", "ergonomic office chair", "dining table", "gaming chair"];
    expect(clusterKeywords(input)).toEqual(clusterKeywords(input));
  });

  it("handles an empty list without error", () => {
    expect(clusterKeywords([])).toEqual([]);
  });

  it("puts a keyword with no overlap into its own singleton cluster", () => {
    const clusters = clusterKeywords(["completely unique term xyz"]);
    expect(clusters).toEqual([{ clusterName: "Completely", keywords: ["completely unique term xyz"] }]);
  });
});
