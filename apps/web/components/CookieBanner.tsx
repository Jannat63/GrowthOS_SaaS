"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { startAnalytics, stopAnalytics } from "@/lib/analytics";
import { analyticsAvailable, onConsentChange, readConsent, writeConsent } from "@/lib/consent";
import { Button } from "@growthos/ui/components/button";

/**
 * The consent gate, and the banner that asks for it.
 *
 * Mounted once from Providers, so it also owns the decision on every page — including the pages
 * that never render the banner because the question was already answered.
 *
 * Three deliberate choices:
 *
 * It is not a modal. There is no scrim, nothing is blocked, and focus is not trapped: a reader who
 * came for the blog post can read the blog post. A consent dialogue that holds the page hostage
 * collects agreement, not consent, and it wrecks the first thing a visitor sees.
 *
 * Decline is a real button of the same size as Accept, one click, in the same place. The pattern
 * where refusing means opening a preferences panel and toggling six switches is the pattern this
 * is deliberately not.
 *
 * It does not appear at all when no analytics key is configured, because then the only cookie is
 * the session and there is nothing optional to ask about. A banner asking permission for nothing
 * is how people learn to dismiss banners unread.
 */
export function CookieBanner() {
  // Starts closed on both server and client. Reading localStorage during render would disagree
  // with the server-rendered HTML and throw a hydration error; the effect below settles it.
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!analyticsAvailable()) return;

    const existing = readConsent();
    if (existing === "granted") startAnalytics();
    if (existing === null) setAsking(true);

    // The cookie policy page can change the answer too, and analytics has to follow it there.
    return onConsentChange((choice) => {
      if (choice === "granted") startAnalytics();
      else stopAnalytics();
      setAsking(false);
    });
  }, []);

  if (!asking) return null;

  return (
    <div
      // `region`, not `dialog` — it is not modal, and calling it a dialog tells a screen reader
      // the rest of the page is inert when it is not.
      role="region"
      aria-label="Cookie choices"
      className="view-enter fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border bg-card p-5 shadow-lg sm:flex-row sm:items-center sm:gap-6">
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
          We use one cookie to keep you signed in, and — only if you agree — one to see which
          features get used. No advertising cookies, no cross-site tracking.{" "}
          <Link
            href="/cookies"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            What we store
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => writeConsent("denied")}>
            Decline
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={() => writeConsent("granted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
