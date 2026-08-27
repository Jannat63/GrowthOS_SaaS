import { describe, it, expect } from "vitest";
import { channelLabel } from "./channels.js";

describe("channelLabel", () => {
  it("maps the known channel slugs to their product names", () => {
    expect(channelLabel("google_ads")).toBe("Google Ads");
    expect(channelLabel("meta_ads")).toBe("Meta Ads");
    expect(channelLabel("seo")).toBe("SEO");
    expect(channelLabel("organic")).toBe("Organic Search");
  });

  it("title-cases an unknown slug rather than printing it raw", () => {
    expect(channelLabel("tiktok_ads")).toBe("Tiktok Ads");
  });

  it("keeps acronyms upper-case in the fallback", () => {
    expect(channelLabel("seo_content")).toBe("SEO Content");
  });

  it("passes an empty slug straight through", () => {
    expect(channelLabel("")).toBe("");
  });
});
