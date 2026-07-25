import { describe, it, expect } from "vitest";
import { liveOrMock } from "./liveOrMock";

describe("liveOrMock", () => {
  it("returns live data when the fetcher resolves", async () => {
    const result = await liveOrMock(
      async () => "live-value",
      () => "mock-value"
    );
    expect(result).toEqual({ data: "live-value", source: "live" });
  });

  it("falls back to mock when the fetcher rejects", async () => {
    const result = await liveOrMock(
      async () => {
        throw new Error("backend down");
      },
      () => "mock-value"
    );
    expect(result).toEqual({ data: "mock-value", source: "mock" });
  });

  it("does not invoke the mock when the live call succeeds", async () => {
    let mockCalled = false;
    await liveOrMock(
      async () => 1,
      () => {
        mockCalled = true;
        return 0;
      }
    );
    expect(mockCalled).toBe(false);
  });
});
