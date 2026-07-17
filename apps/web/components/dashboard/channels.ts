import { Search, MousePointerClick, Megaphone, type LucideIcon } from "lucide-react";
import type { CrossChannelRecommendation } from "@growthos/logic";

export type ChannelKey = "seo" | "google" | "meta";

export const CHANNELS: Record<
  ChannelKey,
  { label: string; icon: LucideIcon; tone: "primary" | "success" }
> = {
  seo: { label: "SEO", icon: Search, tone: "success" },
  google: { label: "Google Ads", icon: MousePointerClick, tone: "primary" },
  meta: { label: "Meta Ads", icon: Megaphone, tone: "primary" },
};

export const CHANNEL_ORDER: ChannelKey[] = ["seo", "google", "meta"];

const BRIDGE_TOKEN: Record<string, ChannelKey> = {
  SEO: "seo",
  GoogleAds: "google",
  Meta: "meta",
};

/** Directional [source, target] channels for a bridge, e.g. "SEO→GoogleAds". */
export function bridgeEndpoints(
  bridge: CrossChannelRecommendation["bridge"]
): [ChannelKey, ChannelKey] {
  const [from, to] = bridge.split("→");
  return [BRIDGE_TOKEN[from]!, BRIDGE_TOKEN[to]!];
}

/** The set of channels a cross-channel recommendation touches. */
export function bridgeChannels(
  bridge: CrossChannelRecommendation["bridge"]
): ChannelKey[] {
  return Array.from(new Set(bridgeEndpoints(bridge)));
}

/** Map a stored platform_connections.platform string onto a channel node. */
export function platformToChannel(platform: string): ChannelKey | null {
  const p = platform.toLowerCase();
  if (p.includes("google") && p.includes("ads")) return "google";
  if (p.includes("meta") || p.includes("facebook")) return "meta";
  if (p.includes("search_console") || p.includes("gsc") || p.includes("seo"))
    return "seo";
  return null;
}
