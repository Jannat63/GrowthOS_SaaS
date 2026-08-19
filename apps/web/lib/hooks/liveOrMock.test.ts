import { describe, it, expect } from "vitest";
import { liveOrMock } from "./liveOrMock";
import { ApiError } from "@/lib/api/client";

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

  // A 4xx is the server saying "I understood you and I am refusing". Answering that with invented
  // numbers is the worst available response: wrong, convincing, and it hides the one fact the user
  // needed. These are the cases that used to render fiction behind a small badge.
  it.each([
    [402, "PLAN_LIMIT_REACHED" as const, "You've reached your starter plan's limit (5)."],
    [403, "FORBIDDEN" as const, "You are not a member of this workspace."],
    [401, "UNAUTHORIZED" as const, "You must be signed in."],
    [400, "VALIDATION_ERROR" as const, "Use a 6-digit hex color."],
  ])("propagates a %i rather than fabricating data", async (status, code, message) => {
    await expect(
      liveOrMock(
        async () => {
          throw new ApiError(message, status, code);
        },
        () => "mock-value"
      )
    ).rejects.toThrow(message);
  });

  it("still falls back when the backend is unreachable — the original purpose", async () => {
    const result = await liveOrMock(
      async () => {
        throw new TypeError("fetch failed");
      },
      () => "mock-value"
    );
    expect(result).toEqual({ data: "mock-value", source: "mock" });
  });

  it("falls back on a 5xx, which means the backend is broken rather than refusing", async () => {
    const result = await liveOrMock(
      async () => {
        throw new ApiError("Internal server error", 500, "INTERNAL_ERROR");
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
