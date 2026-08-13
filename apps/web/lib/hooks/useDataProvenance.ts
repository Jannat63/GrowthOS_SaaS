"use client";
import { useConnections } from "./useConnections";
import { useWorkspace } from "./useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";

/**
 * Where the numbers on screen actually came from.
 *
 * `liveOrMock` answers a narrower question than the UI was treating it as. Its `"live"` means only
 * "the API responded" — not "this is your data". Today every channel except Search Console is served
 * from seeded ClickHouse rows or fixtures, so a workspace with nothing connected still got a green
 * "Live data" badge over numbers that belong to no one. That is the trust problem in
 * docs/AUDIT-2026-08-13-codebase.md #14.
 *
 * Three states, because there are genuinely three:
 *
 *  - `live`    — the API answered and the platform behind this view is connected. Real data.
 *  - `sample`  — the API answered, but nothing is connected, so it served demonstration data.
 *  - `offline` — the API was unreachable and the page computed locally from fixtures.
 *
 * `sample` and `offline` are both fake, and kept apart deliberately: `sample` is the expected state
 * before onboarding finishes and is fixed by connecting an account, while `offline` means something
 * is broken. Collapsing them would tell a user to go connect an account when the real problem is
 * that their backend is down.
 */
export type DataProvenance = "live" | "sample" | "offline";

/** Platforms a module can depend on. Only Search Console is wired end to end today. */
export type ProvenancePlatform =
  | "google_search_console"
  | "google_ads"
  | "meta_ads"
  | "shopify";

/**
 * Several views combine channels — blended MER needs both ad platforms, attribution needs all
 * three. Those are `live` only when every provider they read from is connected: a MER figure
 * computed from real Google spend and seeded Meta spend is not a real MER figure, and calling it
 * live would be the same error this hook exists to correct, just harder to spot.
 */
export function resolveProvenance(
  source: "live" | "mock" | undefined,
  platform: ProvenancePlatform | readonly ProvenancePlatform[] | undefined,
  connections: ReadonlyArray<{ platform: string; isActive: boolean }>,
): DataProvenance {
  // Checked first: an unreachable API means these numbers were computed locally regardless of what
  // is connected, and a stale cached connection list must not upgrade that to "live".
  if (source === "mock") return "offline";

  // No declared platform means the view isn't backed by an external provider at all — workspace
  // settings, audit activity, billing. Those are genuinely live once the API answers, and marking
  // them "sample" would cry wolf on the one badge that has to stay meaningful.
  if (platform === undefined) return "live";

  const required = Array.isArray(platform)
    ? platform
    : [platform as ProvenancePlatform];
  if (required.length === 0) return "live";

  const active = new Set(
    connections.filter((c) => c.isActive).map((c) => c.platform),
  );
  return required.every((p) => active.has(p)) ? "live" : "sample";
}

/** React wrapper: resolves the current workspace's connections and applies the rule above. */
export function useDataProvenance(
  source: "live" | "mock" | undefined,
  platform: ProvenancePlatform | readonly ProvenancePlatform[] | undefined,
): DataProvenance {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  const { data: connections } = useConnections(workspaceId);

  return resolveProvenance(source, platform, connections?.data ?? []);
}

/**
 * Which providers each dashboard view reads from, in one place so a page and its badge can't drift
 * apart. Referenced by name at the call sites rather than inlined, so wiring a new provider means
 * editing this map instead of hunting for string literals.
 */
export const MODULE_PLATFORMS = {
  seo: ["google_search_console"],
  googleAds: ["google_ads"],
  metaAds: ["meta_ads"],
  fatigue: ["meta_ads"],
  paidToOrganic: ["google_ads", "google_search_console"],
  organicToPaid: ["google_search_console", "meta_ads"],
  blendedMer: ["google_ads", "meta_ads"],
  attribution: ["google_ads", "meta_ads", "google_search_console"],
  crossChannel: ["google_ads", "meta_ads", "google_search_console"],
} as const satisfies Record<string, readonly ProvenancePlatform[]>;
