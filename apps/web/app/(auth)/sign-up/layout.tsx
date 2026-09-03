import { pageMeta } from "@/lib/seo";

/**
 * Metadata for a client-rendered page.
 *
 * `page.tsx` here is a Client Component and a Client Component cannot export `metadata` — so the
 * page's title, description and canonical live in the segment's own layout, which is a Server
 * Component that renders its child and nothing else.
 */
export const metadata = pageMeta({
  title: "Start your free trial",
  description:
    "Create a GrowthOS account and connect Search Console, Google Ads, and Meta with read-only access. 14-day Growth trial, no credit card.",
  path: "/sign-up",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
