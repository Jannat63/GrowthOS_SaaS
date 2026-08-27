import { Search, MousePointerClick, Megaphone, type LucideIcon } from "lucide-react";

export type ChannelKey = "seo" | "google" | "meta";

export const CHANNELS: Record<
  ChannelKey,
  { label: string; icon: LucideIcon; tone: "primary" | "success" }
> = {
  seo: { label: "SEO", icon: Search, tone: "success" },
  google: { label: "Google Ads", icon: MousePointerClick, tone: "primary" },
  meta: { label: "Meta Ads", icon: Megaphone, tone: "primary" },
};

/** Map a Recommendation source/target channel string onto a channel node. */
export function channelToKey(channel: string): ChannelKey | null {
  switch (channel) {
    case "seo":
      return "seo";
    case "google_ads":
      return "google";
    case "meta_ads":
      return "meta";
    default:
      return null;
  }
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
