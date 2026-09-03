import { pageMeta } from "@/lib/seo";

/**
 * Metadata for a client-rendered page.
 *
 * `page.tsx` here is a Client Component and a Client Component cannot export `metadata` — so the
 * page's title, description and canonical live in the segment's own layout, which is a Server
 * Component that renders its child and nothing else.
 */
export const metadata = pageMeta({
  title: "Sign in",
  description:
    "Sign in to GrowthOS — one loop across SEO, Google Ads, and Meta Ads.",
  path: "/sign-in",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
