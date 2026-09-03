"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "./Logo";

const NAV = [
  { href: "/#bridges", label: "The exchange" },
  { href: "/#product", label: "Product" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Start free</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="ml-0.5 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t bg-background px-6 py-4 md:hidden"
        >
          <ul className="space-y-1">
            {NAV.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="border-t pt-2 sm:hidden">
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="block rounded-md py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
