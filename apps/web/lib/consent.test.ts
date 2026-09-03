import { beforeEach, describe, expect, it, vi } from "vitest";
import { onConsentChange, readConsent, writeConsent } from "./consent";

/**
 * The consent module decides whether PostHog loads, so the branch that matters most is the one
 * that is hardest to see in a browser: what happens when the answer is missing or unreadable.
 *
 * `environment: "node"` in vitest.config gives no window, so each test installs the minimum of
 * one — a Map-backed localStorage and a real EventTarget for the change notification.
 */
function installWindow(storage?: Partial<Storage>) {
  const map = new Map<string, string>();
  const target = new EventTarget();
  const win = {
    localStorage: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      ...storage,
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("CustomEvent", globalThis.CustomEvent);
  return map;
}

beforeEach(() => vi.unstubAllGlobals());

describe("readConsent", () => {
  it("is null before anyone has answered, which is what shows the banner", () => {
    installWindow();
    expect(readConsent()).toBeNull();
  });

  it("round-trips a granted answer", () => {
    installWindow();
    writeConsent("granted");
    expect(readConsent()).toBe("granted");
  });

  it("round-trips a denied answer", () => {
    installWindow();
    writeConsent("denied");
    expect(readConsent()).toBe("denied");
  });

  it("treats a corrupted value as unanswered rather than as agreement", () => {
    const map = installWindow();
    map.set("growthos.analytics-consent", "yes-please");
    expect(readConsent()).toBeNull();
  });

  it("reads as unanswered when storage throws, so analytics stays off", () => {
    // Safari in private mode, or a browser set to block site data. Withholding is the safe
    // direction: the alternative is loading a tracker because we could not read a refusal.
    installWindow({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(readConsent()).toBeNull();
  });
});

describe("writeConsent", () => {
  it("notifies subscribers in the same tab", () => {
    installWindow();
    const seen: string[] = [];
    onConsentChange((c) => seen.push(c));
    writeConsent("granted");
    writeConsent("denied");
    expect(seen).toEqual(["granted", "denied"]);
  });

  it("still notifies when the write itself fails", () => {
    // The choice must apply for this page's lifetime even if it cannot be remembered — otherwise
    // clicking Decline in private mode would leave analytics running.
    installWindow({
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const seen: string[] = [];
    onConsentChange((c) => seen.push(c));
    expect(() => writeConsent("denied")).not.toThrow();
    expect(seen).toEqual(["denied"]);
  });

  it("stops notifying after unsubscribe", () => {
    installWindow();
    const seen: string[] = [];
    onConsentChange((c) => seen.push(c))();
    writeConsent("granted");
    expect(seen).toEqual([]);
  });
});
