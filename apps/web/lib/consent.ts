"use client";

/**
 * Whether the visitor has agreed to the optional analytics cookie.
 *
 * Two things make this more than a banner. First, `Providers` used to call `initAnalytics()` on
 * mount, so PostHog set its cookies before anyone was asked — the choice has to gate the SDK, not
 * sit next to it. Second, the answer has to be reachable again later: a consent you cannot
 * withdraw is not consent, which is also the `[add opt-out mechanism]` the cookie policy was
 * carrying as a placeholder.
 *
 * Stored in localStorage rather than in a cookie. Recording a refusal by writing a cookie is a
 * poor joke, and nothing server-rendered needs to read this — the SDK it gates is client-side.
 */

export type Consent = "granted" | "denied";

const KEY = "growthos.analytics-consent";

/** Same-tab notification. `storage` only fires in *other* tabs, so it cannot do this job alone. */
const CHANGED = "growthos:analytics-consent";

/**
 * Whether there is anything optional to ask about.
 *
 * With no PostHog key this deployment sets exactly one cookie — the session — and it is strictly
 * necessary. Asking permission to do nothing trains people to dismiss the banner without reading
 * it, and it is the reason so many consent banners are meaningless. Inlined at build time by Next,
 * so this is a constant in the bundle rather than a runtime lookup.
 */
export function analyticsAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

/** `null` means unanswered — the only state that shows the banner. */
export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    // Private mode, or storage blocked entirely. Unanswered is the safe reading: it withholds
    // analytics rather than assuming agreement.
    return null;
  }
}

export function writeConsent(choice: Consent): void {
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    // The banner still dismisses and the choice still applies for this page's lifetime; it just
    // cannot be remembered. Failing the write is not a reason to ignore what they clicked.
  }
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: choice }));
}

/** Subscribe to changes from anywhere — the banner, or the control on the cookie policy page. */
export function onConsentChange(fn: (choice: Consent) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<Consent>).detail);
  window.addEventListener(CHANGED, handler);
  return () => window.removeEventListener(CHANGED, handler);
}
