/**
 * One source for both the landing page section and the /faq route.
 *
 * Answers are held to what has actually shipped. In particular: no AI image or video generation
 * (deferred), no AI-citation tracking (deferred), no writes into live ad accounts (blocked on
 * platform approval), and no claim that a large language model writes the copy — generation is
 * deterministic and template-driven.
 */
export type FaqItem = { q: string; a: string };

export const FAQ: FaqItem[] = [
  {
    q: "What does GrowthOS connect to?",
    a: "Google Search Console, Google Ads, and Meta Ads, plus your store for revenue. Connections are read-only — GrowthOS reads performance data and writes recommendations into your queue. It never has permission to change a bid, edit a campaign, or spend your budget.",
  },
  {
    q: "How is this different from Semrush or Ahrefs?",
    a: "Those are excellent SEO tools that stop at the edge of SEO. GrowthOS is built around what happens between channels: a converting paid search term becoming a content brief, a top-ranking page becoming a Meta audience. If you only run SEO, a dedicated SEO tool will go deeper. If you run all three, nothing else connects them at this price.",
  },
  {
    q: "How is it different from Northbeam or Triple Whale?",
    a: "Mostly price and scope. Enterprise attribution platforms solve the measurement half well, at $50,000 or more a year. GrowthOS covers measurement and the work that follows from it — the briefs, the rotations, the budget shifts — starting at $79 a month.",
  },
  {
    q: "Does it work if I only run two of the three channels?",
    a: "Yes, with fewer bridges live. Two channels give you two of the six, plus the single-channel advisors and a blended efficiency number. The product gets meaningfully better with all three connected, and the trial is designed so you can see that before paying.",
  },
  {
    q: "What is Blended MER, and why trust it over platform numbers?",
    a: "Blended MER is total revenue divided by total marketing spend across every channel. It is deliberately boring: because it never attributes a sale to a specific ad, no platform can inflate it by counting a conversion twice. Per-channel attribution still sits underneath it in five models you can compare side by side.",
  },
  {
    q: "Does GrowthOS write my ads and articles for me?",
    a: "It drafts briefs, ad copy variants, and responsive search ads from your own performance data and brand guidelines — structured starting points, not finished publishable work. Generation is deterministic and template-driven rather than a language model improvising, which is why output stays consistent with the rules you set. Image and video generation are not available.",
  },
  {
    q: "How long before it tells me something useful?",
    a: "The first cross-channel recommendations appear once your accounts finish their initial sync, typically within the first session. Bridges that depend on trend data — creative fatigue, rank movement — need a couple of weeks of history before they fire with confidence.",
  },
  {
    q: "Can I use it for client work?",
    a: "Yes, from the Growth tier up. Each brand gets its own workspace, reports can carry your agency's name, logo, and accent colour, and you can invite clients as view-only members. Scale adds unlimited workspaces and API access.",
  },
  {
    q: "What happens when the trial ends?",
    a: "The 14-day trial runs on Growth-tier features and does not ask for a card. When it ends, your data stays where it is and the workspace becomes read-only until you pick a plan. Nothing is deleted, and nothing is charged automatically.",
  },
  {
    q: "Where does my data live?",
    a: "In managed Postgres for account data and a separate analytics store for time-series metrics. Platform tokens are encrypted at rest, connections use read-only scopes, and you can revoke any connection from the settings page — which deletes the stored token immediately.",
  },
];
