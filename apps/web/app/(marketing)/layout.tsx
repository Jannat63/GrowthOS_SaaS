import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { PageTransition } from "@/components/PageTransition";

/**
 * The marketing site. Pricing, about, the blog and the legal pages get the same settling entrance
 * the rest of the product has — they are documents, read down the page, so they take the vertical
 * `view` variant rather than the dashboard's lateral one.
 *
 * The landing page is the exception, and the only one in the app. It already has a page-load
 * sequence of its own — the loop animation, the ambient glows, the staged reveal — and a wrapper
 * fading the whole thing in first would step on it. A transformed ancestor would also take over the
 * containing block its pinned elements resolve against, so the wrapper is omitted there entirely
 * rather than merely made invisible.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageTransition variant="view" exclude={["/"]}>
          {children}
        </PageTransition>
      </main>
      <SiteFooter />
    </div>
  );
}
