import type { Metadata } from "next";

/**
 * One place that knows the site's address and how a page describes itself.
 *
 * Read from the environment for the same reason robots.ts and sitemap.ts do: a preview deployment
 * that hardcodes the production origin emits canonical URLs pointing at production, which tells a
 * crawler the preview *is* the real page.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growthos.app";
export const SITE_NAME = "GrowthOS";

/**
 * The site-wide share card, named explicitly.
 *
 * Next attaches the `app/opengraph-image` file convention to whichever `openGraph` object is
 * nearest — so the moment a page declares an `openGraph` of its own, the root layout's (and the
 * image merged into it) is replaced wholesale rather than extended. Every page below the homepage
 * was therefore shipping `twitter:card: summary_large_image` with no image to put in it, which
 * renders as an empty card rather than as no card. Naming the route here puts it back.
 *
 * `metadataBase` resolves the leading slash, so a preview deployment points at its own image.
 */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "GrowthOS — a win in one channel becomes the next move in another",
};

/**
 * A public page: title, description, and — the part that is easy to forget and expensive to
 * omit — a canonical URL.
 *
 * Without a canonical, every ad tracking parameter, every `?ref=` a reader shares, and every
 * trailing-slash variant is a separate page in the index competing with the original for the same
 * words. `metadataBase` in the root layout resolves these root-relative paths, so a page passes
 * `/pricing` and gets `https://growthos.app/pricing` in the tag.
 *
 * The Open Graph title is spelled out rather than left to inherit: Next's title `template` applies
 * to `title` only, so an og:title left to itself would read "Pricing" where the tab reads
 * "Pricing · GrowthOS".
 */
export function pageMeta({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** Root-relative, no origin and no trailing slash — "/pricing", or "/" for the homepage. */
  path: string;
}): Metadata {
  const social = `${title} · ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: social,
      description,
      url: `${SITE_URL}${path}`,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: social, description, images: [OG_IMAGE.url] },
  };
}

/**
 * A signed-in surface: a real browser-tab title, and nothing for a crawler.
 *
 * robots.ts already disallows these paths, but "disallowed" and "not indexed" are different
 * claims — a disallowed URL that is linked from somewhere can still appear in results as a bare
 * title, because the crawler was told not to *fetch* it, not that it should not be listed. The
 * meta tag is what actually keeps it out, and it costs nothing to state both.
 *
 * No description: there is no audience for one on a page no search engine should be describing.
 */
export function privateMeta(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false, nocache: true },
  };
}

/**
 * Everything that needs a session to show anything.
 *
 * Kept here rather than inline in robots.ts because two things have to agree about it: the crawl
 * directive, and the `privateMeta()` each of these routes carries. The dashboard segment is a flat
 * route group — `(dashboard)` contributes nothing to the URL — so there is no single prefix to
 * disallow and the paths have to be named. Adding a dashboard route means adding it here.
 */
export const PRIVATE_ROUTES = [
  "/api/",
  "/admin",
  "/admin/*",
  // (dashboard)
  "/growth-hub",
  "/intelligence",
  "/recommendations",
  "/content-pipeline",
  "/creative-queue",
  "/fatigue-monitor",
  "/seo",
  "/google-ads",
  "/meta-ads",
  "/analytics",
  "/attribution",
  "/automation",
  "/settings",
  // (auth), past the front door — these render nothing without a session or a token in the URL.
  "/welcome",
  "/two-factor",
  "/business-info",
  "/connect-accounts",
  "/create-workspace",
  "/onboarding-complete",
  "/verify-email",
  "/accept-invite",
] as const;
