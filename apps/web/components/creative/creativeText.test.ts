import { describe, expect, it } from "vitest";
import { generateCreativeBrief } from "@growthos/logic";
import type { TopOrganicPage } from "@growthos/types";
import { budgetFraction, creativeBriefToText, META_LIMITS } from "./creativeText";

const page: TopOrganicPage = {
  keyword: "office chair",
  volume: 18000,
  currentPosition: 6,
  opportunityScore: 61,
};

describe("creativeBriefToText", () => {
  // The generator reads the keyword's position and paid history, not just its name — two
  // opportunities in different positions get different ads. Mirrors `page` so the two agree.
  const brief = generateCreativeBrief({
    keyword: "office chair",
    volume: 18000,
    currentPosition: 6,
    paidProvenConversions: 42,
  });
  const out = creativeBriefToText('Amplify "office chair" with a Meta campaign', brief, page);

  it("carries the play and the evidence for it", () => {
    // The play is why the ad opens the way it does; a handoff that drops it hands over copy with
    // no reasoning attached.
    expect(out).toContain("THE PLAY");
    expect(out).toContain("Earn the click");
    expect(out).toContain(brief.rationale!);
  });

  it("carries every field the composer asks for", () => {
    // `headline` was the field the old card dropped entirely — it must survive the handoff too.
    expect(out).toContain(brief.hook);
    expect(out).toContain(brief.primaryText);
    expect(out).toContain(brief.headline);
    expect(out).toContain(brief.callToAction);
    expect(out).toContain(brief.format);
    expect(out).toContain(brief.audience);
  });

  it("labels each limited field with its budget", () => {
    expect(out).toContain(`Primary text (${brief.primaryText.length}/${META_LIMITS.primaryText})`);
    expect(out).toContain(`Headline (${brief.headline.length}/${META_LIMITS.headline})`);
  });

  it("names the keyword, not the recommendation's prose", () => {
    // Regression guard: the keyword and the page's figures both used to be threaded in separately,
    // and the call site passed the recommendation body where the keyword belonged. Both are string,
    // so nothing failed — the copied text just read as a garbled sentence quoting itself.
    expect(out).toContain('"office chair" — 18,000 searches/mo, ranking #6 organically.');
    expect(out).not.toContain("top-of-funnel");
  });

  it("omits the evidence block when there is no page behind the brief", () => {
    const bare = creativeBriefToText("t", brief, undefined);
    expect(bare).not.toContain("WHY THIS KEYWORD");
  });

  it("says 'unranked' rather than '#null' when there is no position", () => {
    const out2 = creativeBriefToText("t", brief, { ...page, currentPosition: null });
    expect(out2).toContain("ranking unranked organically");
  });
});

describe("budgetFraction", () => {
  it("clamps at full so an over-budget bar cannot overflow its track", () => {
    expect(budgetFraction(40, 40)).toBe(1);
    expect(budgetFraction(60, 40)).toBe(1);
    expect(budgetFraction(20, 40)).toBe(0.5);
  });
});
