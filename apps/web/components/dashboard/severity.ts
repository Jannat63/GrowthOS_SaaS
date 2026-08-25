import type { BadgeProps } from "@growthos/ui/components/badge";

export type SeverityTier = "High" | "Medium" | "Low";

/**
 * Buckets a 0-100 urgency/composite score into a three-tier label. Thresholds are deliberately
 * coarse (not a precise SLA) — this drives a glance-able badge, not a scheduling decision.
 */
export function severityFromScore(score: number): SeverityTier {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export const SEVERITY_BADGE_VARIANT: Record<SeverityTier, BadgeProps["variant"]> = {
  High: "warning",
  Medium: "default",
  Low: "muted",
};
