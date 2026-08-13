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
 */

let initialized = false;

export function initAnalytics(): void {
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

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(name, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.identify(userId, traits);
}
