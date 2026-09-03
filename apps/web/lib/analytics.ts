"use client";
import posthog from "posthog-js";

/**
 * Product analytics (M5 P5.4). PostHog is my pick, not a decision recorded anywhere in
 * docs/blueprint or DECISIONS.md — no analytics provider was specified there. It fits this
 * project's free-tier-first pattern (generous free tier, self-serve, no sales call to start) and
 * covers events + session replay + funnels in one SDK rather than three. Swap it out freely if
 * you'd rather use something else — every call in this file is the only place that would need to
 * change.
 *
 * Safe without configuration: every function below no-ops when `NEXT_PUBLIC_POSTHOG_KEY` isn't
 * set, matching the "gated but never crashes" pattern used for Stripe/Resend on the backend.
 *
 * Gated on consent as well as on configuration. `startAnalytics` is called from the consent
 * layer and from nowhere else — it used to run on mount from Providers, which set PostHog's
 * cookies before the visitor had been asked anything.
 */

let initialized = false;

/** Called once consent is granted. Never call it directly — go through the consent layer. */
export function startAnalytics(): void {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: true,
    person_profiles: "identified_only",
  });
  initialized = true;
}

/**
 * Withdrawing consent after having given it.
 *
 * PostHog cannot be un-initialised, so this stops capture and drops the identity and the stored
 * distinct id rather than pretending the SDK was never loaded. `initialized` stays true: a second
 * `init` on the same page would re-enable capture, which is the opposite of what was asked.
 */
export function stopAnalytics(): void {
  if (!initialized) return;
  posthog.opt_out_capturing();
  posthog.reset();
}

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  // `has_opted_out_capturing` is what makes a withdrawal stick for the rest of the page's life —
  // `initialized` alone would still be true from before the visitor changed their mind.
  if (!initialized || posthog.has_opted_out_capturing()) return;
  posthog.capture(name, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!initialized || posthog.has_opted_out_capturing()) return;
  posthog.identify(userId, traits);
}
