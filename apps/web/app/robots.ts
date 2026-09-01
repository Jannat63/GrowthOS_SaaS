import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growthos.app";

// Everything under here needs an authenticated session to show anything meaningful — crawling it
// wastes crawl budget at best, and at worst indexes a login wall or (for /admin) something that
// should never appear in search results at all.
const DISALLOWED_APP_ROUTES = [
  "/admin",
  "/admin/*",
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
  "/business-info",
  "/connect-accounts",
  "/create-workspace",
  "/onboarding-complete",
  "/verify-email",
  "/accept-invite",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_APP_ROUTES,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
