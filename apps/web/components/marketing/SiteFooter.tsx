import Link from "next/link";

const GROUPS = [
  { title: "Product", links: [{ label: "Features", href: "/#features" }, { label: "Pricing", href: "/pricing" }, { label: "How it works", href: "/#how" }] },
  { title: "Support", links: [{ label: "FAQ", href: "/faq" }, { label: "About", href: "#" }, { label: "Blog", href: "#" }] },
  { title: "Legal", links: [{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Cookies", href: "/cookies" }] },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary-foreground" />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">
                GrowthOS
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              One insight loop for SEO, Google Ads, and Meta Ads.
            </p>
          </div>

          {GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="text-sm font-semibold">{g.title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="transition-colors hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} GrowthOS.</p>
          <div className="flex gap-6">
            <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
            <Link href="/sign-up" className="hover:text-foreground">Start free</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
