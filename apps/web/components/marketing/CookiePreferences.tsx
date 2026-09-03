"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { analyticsAvailable, onConsentChange, readConsent, writeConsent, type Consent } from "@/lib/consent";

/**
 * Changing your mind, on the page that told you what you agreed to.
 *
 * This is what the policy's section 4 used to describe as "[add opt-out mechanism here once
 * decided]". A policy that documents a choice and then offers no way to revisit it is the more
 * common failure, and the harder one to notice, because the page still reads as complete.
 *
 * Writing the choice here reaches the banner's own subscription, which starts or stops PostHog —
 * so declining takes effect on this page, in this tab, without a reload.
 */
export function CookiePreferences() {
  const [choice, setChoice] = useState<Consent | null>(null);
  const [available, setAvailable] = useState(false);

  // Resolved after mount for the same reason the banner does it: localStorage is not readable
  // during a server render, and reading it during the client's first render would mismatch.
  useEffect(() => {
    setAvailable(analyticsAvailable());
    setChoice(readConsent());
    return onConsentChange(setChoice);
  }, []);

  if (!available) {
    return (
      <p className="mt-2 text-muted-foreground">
        This deployment has no analytics key configured, so the optional cookie is never set and
        there is nothing to turn off. The session cookie is the only one in use.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border p-4">
      <p className="text-muted-foreground">
        {choice === "granted"
          ? "Analytics is on. You agreed to the optional cookie."
          : choice === "denied"
            ? "Analytics is off. Only the session cookie is set."
            : "You haven’t answered yet, so analytics is off until you do."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={choice === "granted" ? "default" : "outline"}
          onClick={() => writeConsent("granted")}
        >
          {choice === "granted" && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          Allow analytics
        </Button>
        <Button
          size="sm"
          variant={choice === "denied" ? "default" : "outline"}
          onClick={() => writeConsent("denied")}
        >
          {choice === "denied" && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          Decline analytics
        </Button>
      </div>
    </div>
  );
}
