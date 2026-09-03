import { privateMeta } from "@/lib/seo";

/**
 * Metadata for a client-rendered page.
 *
 * `page.tsx` here is a Client Component and a Client Component cannot export `metadata` — so the
 * title lives in the segment's own layout, which is a Server Component that renders its child and
 * nothing else. It exists for the tab, and for the `noindex` that keeps a signed-in surface out of
 * search results.
 */
export const metadata = privateMeta("Workspace");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
