import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growthos.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/pricing`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/faq`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/security`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/sign-up`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/sign-in`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/cookies`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // `updatedAt`, not the publication date: a post edited last week is a page a crawler should
  // come back to, and the file-based version could only ever report the day it first went out.
  const posts: MetadataRoute.Sitemap = (await getAllPosts()).map((p) => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...posts];
}
