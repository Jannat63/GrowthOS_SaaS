import { describe, expect, it } from "vitest";
import { MODULE_PLATFORMS, resolveProvenance } from "./useDataProvenance";

// This rule decides whether a number on screen claims to be the customer's own. Getting it wrong in
// the permissive direction is the bug in docs/AUDIT-2026-08-13-codebase.md #14 — seeded figures
// wearing a green "Live data" badge — so the cases that must never return "live" are asserted
// explicitly rather than left implied.

const gsc = { platform: "google_search_console", isActive: true };
const googleAds = { platform: "google_ads", isActive: true };
const metaAds = { platform: "meta_ads", isActive: true };

describe("resolveProvenance", () => {
  it("reports live only when the view's provider is connected", () => {
    expect(resolveProvenance("live", MODULE_PLATFORMS.seo, [gsc])).toBe("live");
    expect(resolveProvenance("live", MODULE_PLATFORMS.seo, [])).toBe("sample");
  });

  it("treats an inactive connection as no connection", () => {
    expect(
      resolveProvenance("live", MODULE_PLATFORMS.seo, [
        { platform: "google_search_console", isActive: false },
      ]),
    ).toBe("sample");
  });

  it("does not let one connected channel vouch for another", () => {
    expect(resolveProvenance("live", MODULE_PLATFORMS.metaAds, [gsc])).toBe("sample");
  });

  // The subtle one: a blended metric computed from real Google spend and seeded Meta spend is not a
  // real blended metric. Partial coverage must not read as live.
  it("requires every provider for a multi-channel view", () => {
    expect(resolveProvenance("live", MODULE_PLATFORMS.blendedMer, [googleAds])).toBe("sample");
    expect(
      resolveProvenance("live", MODULE_PLATFORMS.blendedMer, [googleAds, metaAds]),
    ).toBe("live");
  });

  it("reports offline when the API was unreachable, whatever is connected", () => {
    expect(resolveProvenance("mock", MODULE_PLATFORMS.seo, [gsc])).toBe("offline");
    expect(resolveProvenance("mock", undefined, [gsc])).toBe("offline");
  });

  // Settings, billing and activity have no external provider — they really are live once the API
  // answers, and marking them "sample" would devalue the badge everywhere it matters.
  it("reports live for views with no external provider", () => {
    expect(resolveProvenance("live", undefined, [])).toBe("live");
  });

  it("accepts a single platform as well as a list", () => {
    expect(resolveProvenance("live", "meta_ads", [metaAds])).toBe("live");
    expect(resolveProvenance("live", "meta_ads", [])).toBe("sample");
  });

  it("maps every module to at least one platform", () => {
    for (const [name, platforms] of Object.entries(MODULE_PLATFORMS)) {
      expect(platforms.length, `${name} has no platforms`).toBeGreaterThan(0);
    }
  });
});
