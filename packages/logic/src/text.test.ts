import { describe, expect, it } from "vitest";
import { article, coreTopic, titleCase } from "./text.js";

describe("titleCase", () => {
  it("leaves function words lowercase inside a title", () => {
    // `/\b\w/g` capitalised every word, which put "For" in an H1 and an ad headline.
    expect(titleCase("best office chair for back pain")).toBe("Best Office Chair for Back Pain");
    expect(titleCase("sofa and chair set")).toBe("Sofa and Chair Set");
  });

  it("still capitalises a function word that opens or closes the title", () => {
    expect(titleCase("the complete guide")).toBe("The Complete Guide");
    expect(titleCase("what to look for")).toBe("What to Look For");
  });

  it("uppercases acronyms a search term actually carries", () => {
    expect(titleCase("gaming chair rgb")).toBe("Gaming Chair RGB");
    expect(titleCase("usb hub")).toBe("USB Hub");
  });
});

describe("coreTopic", () => {
  it("strips only a leading qualifier", () => {
    expect(coreTopic("best office chair for back pain")).toBe("office chair for back pain");
    expect(coreTopic("cheap standing desk")).toBe("standing desk");
  });

  it("leaves a qualifier that is not in first position", () => {
    expect(coreTopic("chairs for best posture")).toBe("chairs for best posture");
  });

  it("never strips a term down to nothing", () => {
    expect(coreTopic("best")).toBe("best");
  });
});

describe("article", () => {
  it("agrees with the following sound", () => {
    expect(article("office chair")).toBe("an");
    expect(article("ergonomic chair")).toBe("an");
    expect(article("gaming chair")).toBe("a");
  });
});
