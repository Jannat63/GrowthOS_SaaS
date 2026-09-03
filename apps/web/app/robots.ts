import type { MetadataRoute } from "next";
import { PRIVATE_ROUTES, SITE_URL } from "@/lib/seo";

/**
 * Crawling it wastes crawl budget at best, and at worst indexes a login wall or — for /admin —
 * a surface that should never appear in a search result at all. The list itself lives in lib/seo
 * because the pages named in it also carry a `noindex` tag of their own: robots.txt asks a crawler
 * not to fetch a URL, which is not the same as asking it not to list one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_ROUTES],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
