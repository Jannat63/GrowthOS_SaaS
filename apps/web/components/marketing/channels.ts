import { Search, MousePointerClick, Megaphone, type LucideIcon } from "lucide-react";

/**
 * The three channels and the six bridges between them.
 *
 * This is not marketing invention: `docs/blueprint/PRD.md` §1.3 defines exactly these six
 * channel-pair bridges, and P3.4 shipped 19 intelligence rules across them. Three nodes with a
 * directed edge each way is a complete directed graph — which is the actual claim the product
 * makes, and the reason the Exchange draws six arcs rather than one decorative ring.
 */

export type ChannelId = "seo" | "google" | "meta";

export type Channel = {
  id: ChannelId;
  name: string;
  short: string;
  icon: LucideIcon;
  /** Tailwind classes bound to the --channel-* tokens, so a channel keeps one colour everywhere. */
  text: string;
  bg: string;
  ring: string;
  /** For SVG stroke/fill, which cannot take a utility class. */
  cssVar: string;
};

export const CHANNELS: Record<ChannelId, Channel> = {
  seo: {
    id: "seo",
    name: "SEO",
    short: "SEO",
    icon: Search,
    text: "text-channel-seo",
    bg: "bg-channel-seo/10",
    ring: "ring-channel-seo/30",
    cssVar: "var(--channel-seo)",
  },
  google: {
    id: "google",
    name: "Google Ads",
    short: "GOOGLE",
    icon: MousePointerClick,
    text: "text-channel-google",
    bg: "bg-channel-google/10",
    ring: "ring-channel-google/30",
    cssVar: "var(--channel-google)",
  },
  meta: {
    id: "meta",
    name: "Meta Ads",
    short: "META",
    icon: Megaphone,
    text: "text-channel-meta",
    bg: "bg-channel-meta/10",
    ring: "ring-channel-meta/30",
    cssVar: "var(--channel-meta)",
  },
};

export type Bridge = {
  from: ChannelId;
  to: ChannelId;
  /** The signal that fires the rule. */
  trigger: string;
  /** What lands in your queue as a result. */
  result: string;
  /** One line of plain explanation, for the enumerated list. */
  detail: string;
};

export const BRIDGES: Bridge[] = [
  {
    from: "google",
    to: "seo",
    trigger: "A paid search term converts",
    result: "SEO content brief created",
    detail:
      "You already paid to learn this phrase sells. The brief goes out to rank for it organically, so you stop renting the click.",
  },
  {
    from: "seo",
    to: "google",
    trigger: "An organic rank slips",
    result: "Google Ads campaign recommended",
    detail:
      "Losing position three on a page that drives revenue is a paid-search brief, not just a red cell in a rank tracker.",
  },
  {
    from: "meta",
    to: "seo",
    trigger: "A Meta hook clears 3% CTR",
    result: "SEO article brief from that hook",
    detail:
      "The angle that stopped the scroll is the angle worth writing. Creative testing becomes content research.",
  },
  {
    from: "seo",
    to: "meta",
    trigger: "A page reaches the top three",
    result: "Meta top-of-funnel brief",
    detail:
      "A page that earns its ranking has proven demand behind it. That is the audience worth paying to widen.",
  },
  {
    from: "google",
    to: "meta",
    trigger: "Google converters identified",
    result: "Meta Lookalike seed synced",
    detail:
      "The people who converted on search are the best seed audience you own — and the sync happens without a CSV.",
  },
  {
    from: "meta",
    to: "google",
    trigger: "Meta lifts branded search",
    result: "Smart Bidding signals improved",
    detail:
      "Social demand shows up as branded queries days later. Feeding that back stops search from taking credit blindly.",
  },
];
