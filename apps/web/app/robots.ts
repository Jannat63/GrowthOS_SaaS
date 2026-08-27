import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growthos.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The product itself is behind auth and has nothing to index.
        disallow: [
          "/api/",
          "/growth-hub",
          "/settings",
          "/analytics",
          "/attribution",
          "/automation",
          "/content-pipeline",
          "/creative-queue",
          "/fatigue-monitor",
          "/google-ads",
          "/intelligence",
          "/meta-ads",
          "/recommendations",
          "/seo",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
