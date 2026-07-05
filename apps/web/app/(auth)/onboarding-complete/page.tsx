import Link from "next/link";
import { PartyPopper, ArrowRight } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@growthos/ui/components/button";

export default function OnboardingCompletePage() {
  return (
    <OnboardingShell step={4}>
      <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
          <PartyPopper className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
          Your workspace is ready
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          GrowthOS is scanning your channels for the first cross-channel plays.
          They&rsquo;ll appear on your dashboard shortly.
        </p>
        {/* The dashboard (/growth-hub) is built in a later slice; link is live-ready. */}
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="group">
            <Link href="/growth-hub">
              Go to dashboard
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}
