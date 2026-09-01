import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growthos.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/sign-up", priority: 0.5, changeFrequency: "monthly" },
    { path: "/sign-in", priority: 0.3, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.2, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "monthly" },
    { path: "/cookies", priority: 0.2, changeFrequency: "monthly" },
  ];

  return pages.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
