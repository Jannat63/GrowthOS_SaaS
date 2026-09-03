import Link from "next/link";
import { Logo } from "./Logo";

/** Every href below resolves to a real route. Careers was dropped rather than shipped as a
 *  placeholder — an empty page is worse than an absent link. */
const GROUPS = [
  {
    title: "Product",
    links: [
      { label: "The exchange", href: "/#bridges" },
      { label: "Product tour", href: "/#product" },
      { label: "How it works", href: "/#how" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
      { label: "About", href: "/about" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-[15rem] text-sm leading-relaxed text-muted-foreground">
              Six bridges between SEO, Google Ads, and Meta Ads.
            </p>
          </div>

          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
                {g.title.toUpperCase()}
              </p>
              <ul className="mt-4 space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} GrowthOS.
          </p>
          <div className="flex gap-6">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Start free
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
