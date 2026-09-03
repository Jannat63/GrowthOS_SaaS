import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/seo";

/**
 * A sitemap lists the pages we want found, which is a narrower set than the pages a crawler is
 * allowed to reach. /sign-in is reachable and harmless but is a login wall with nothing to rank
 * for, so it is not advertised here; /sign-up is, because it is where the trial starts.
 *
 * Every URL here is one `pageMeta()` also names as its own canonical. That agreement is the point:
 * a sitemap that lists an address a page does not claim as canonical is a contradiction a crawler
 * resolves by ignoring the sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The deploy is the only honest "last modified" a hand-written page has. Stamping today's date
  // on a legal page that has not changed since March would be a lie a crawler learns to discount.
  const built = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: built, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: built, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: built, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/faq`, lastModified: built, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: built, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/security`, lastModified: built, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/sign-up`, lastModified: built, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: built, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: built, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cookies`, lastModified: built, changeFrequency: "yearly", priority: 0.3 },
  ];

  // `updatedAt`, not the publication date: a post edited last week is a page a crawler should come
  // back to. `monthly` matches that — a post whose body is edited from the console is not the
  // once-and-done document the old `yearly` claimed it was.
  const posts: MetadataRoute.Sitemap = (await getAllPosts()).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...posts];
}
