import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { privateMeta } from "@/lib/seo";

/**
 * A 404 is a page nobody meant to land on, so it is judged on one thing: how fast it gets someone
 * to the page they did mean. It now carries the site's own header and footer — the full navigation
 * — because the previous version offered a logo and two buttons and left a visitor who wanted
 * pricing to guess. The header is also what makes this read as GrowthOS rather than as a server
 * error screen.
 *
 * The explicit `noindex` is not redundant with the one Next emits for a not-found, and dropping it
 * is worse than leaving it: the root layout sets a site-wide `index, follow`, which this page
 * inherits unless it says otherwise. Without this the 404 shipped both `noindex` and
 * `index, follow` and left the crawler to reconcile them.
 */
export const metadata = privateMeta("Page not found");

/** Named because a lost visitor arrived from somewhere, and these are the somewheres. */
const DESTINATIONS = [
  {
    href: "/blog",
    label: "Blog",
    body: "Notes on measurement, creative decay, and the work that falls between three tools.",
  },
  {
    href: "/pricing",
    label: "Pricing",
    body: "Starter, Growth, and Scale, with what each plan connects and how many workspaces it holds.",
  },
  {
    href: "/faq",
    label: "FAQ",
    body: "What GrowthOS connects to, what the trial includes, and where your data lives.",
  },
];

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="view-enter mx-auto w-full max-w-2xl flex-1 px-6 py-24">
        <p className="font-mono text-[11px] tracking-[0.18em] text-primary">404</p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.12] tracking-tight">
          That page isn&rsquo;t here
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          The address may be mistyped, or the page may have moved — posts get renamed and old links
          keep pointing at the old name. Everything else is running normally.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/">
              Back to home
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-up">Start free</Link>
          </Button>
        </div>

        {/* The same bordered row the blog index uses, rather than a new card grid — a list of
            places to go is a list, and this one already exists in the design system. */}
        <ul className="mt-16 border-t">
          {DESTINATIONS.map((d) => (
            <li key={d.href} className="border-b">
              <Link
                href={d.href}
                className="group flex items-baseline gap-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="w-20 shrink-0 font-mono text-[10px] tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-primary">
                  {d.label.toUpperCase()}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">{d.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter />
    </div>
  );
}
