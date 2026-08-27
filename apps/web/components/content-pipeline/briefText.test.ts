import { describe, expect, it } from "vitest";
import { generateContentBrief } from "@growthos/logic";
import {
  briefAnchorId,
  briefToMarkdown,
  costPerConversion,
  META_DESCRIPTION_BUDGET,
  META_TITLE_BUDGET,
} from "./briefText";
import { STAGES, nextStage, stageIndex } from "./stages";

describe("briefToMarkdown", () => {
  const brief = generateContentBrief("best office chair for back pain");
  const md = briefToMarkdown("best office chair for back pain", brief);

  it("carries every part of the brief a writer needs", () => {
    // The page used to render `headingStructure.length` — "4 sections" — and none of the sections.
    for (const heading of brief.headingStructure) expect(md).toContain(heading);
    for (const q of brief.faqQuestions) expect(md).toContain(q);
    expect(md).toContain(brief.recommendedH1);
    expect(md).toContain(brief.metaTitle);
    expect(md).toContain(brief.metaDescription);
    expect(md).toContain("best office chair for back pain"); // the target keyword
  });

  it("numbers the outline in document order", () => {
    expect(md).toContain(`1. ${brief.headingStructure[0]}`);
    expect(md).toContain(`4. ${brief.headingStructure[3]}`);
  });

  it("omits sections it has nothing to put in", () => {
    // internalLinkTargets is always empty today; an empty "Internal links" heading would read as
    // something the writer forgot to fill in.
    expect(brief.internalLinkTargets).toHaveLength(0);
    expect(md).not.toContain("## Internal links");
  });
});

describe("meta budgets", () => {
  it("keeps the generated meta inside what a search result shows", () => {
    const b = generateContentBrief("best office chair for back pain");
    expect(b.metaTitle.length).toBeLessThanOrEqual(META_TITLE_BUDGET);
    expect(b.metaDescription.length).toBeLessThanOrEqual(META_DESCRIPTION_BUDGET);
  });
});

describe("costPerConversion", () => {
  it("divides spend by conversions", () => {
    expect(costPerConversion(612.4, 38)).toBeCloseTo(16.12, 2);
  });

  it("returns null rather than dividing by zero", () => {
    expect(costPerConversion(210, 0)).toBeNull();
  });
});

describe("briefAnchorId", () => {
  it("produces a valid id from the offline queue's semantic ids", () => {
    // `p2o:best office chair for back pain` has a colon and spaces — invalid in an id, and the
    // table's jump-to-brief link silently does nothing with it.
    const id = briefAnchorId("p2o:best office chair for back pain");
    expect(id).toBe("brief-p2o-best-office-chair-for-back-pain");
    expect(id).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
  });

  it("leaves a uuid alone apart from the prefix", () => {
    expect(briefAnchorId("2f1c8b90-0e5a-4c1d-9a77-2b3c4d5e6f70")).toBe(
      "brief-2f1c8b90-0e5a-4c1d-9a77-2b3c4d5e6f70"
    );
  });
});

describe("pipeline stages", () => {
  it("advances through every stage and stops at the end", () => {
    expect(nextStage("draft")?.key).toBe("approved");
    expect(nextStage("approved")?.key).toBe("in_progress");
    expect(nextStage("in_progress")?.key).toBe("published");
    expect(nextStage("published")).toBeNull();
  });

  it("orders the stages as the schema defines them", () => {
    expect(STAGES.map((s) => s.key)).toEqual([
      "draft",
      "approved",
      "in_progress",
      "published",
    ]);
    expect(stageIndex("published")).toBe(3);
  });
});
