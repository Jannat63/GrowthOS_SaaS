"use client";

import { useRouter } from "next/navigation";
import { Search, MousePointerClick, Megaphone, ShoppingBag, Check, ArrowRight } from "lucide-react";
import { useOnboarding } from "@/lib/stores/onboarding";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@growthos/ui/components/button";
import { cn } from "@/lib/utils/cn";

const CHANNELS = [
  { id: "google_search_console", name: "Search Console", desc: "Organic search & SEO", icon: Search },
  { id: "google_ads", name: "Google Ads", desc: "Paid search & shopping", icon: MousePointerClick },
  { id: "meta", name: "Meta Ads", desc: "Facebook & Instagram", icon: Megaphone },
  { id: "shopify", name: "Shopify", desc: "Revenue & orders", icon: ShoppingBag },
];

export default function ConnectAccountsPage() {
  const router = useRouter();
  const { connected, toggleChannel } = useOnboarding();

  return (
    <OnboardingShell step={2}>
      <div className="rounded-2xl border bg-card p-8 shadow-lg">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Connect your channels
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The loop gets smarter with every channel you connect. You can add more
          later.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {CHANNELS.map(({ id, name, desc, icon: Icon }) => {
            const isOn = connected.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleChannel(id)}
                aria-pressed={isOn}
                className={cn(
                  "group flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200",
                  isOn
                    ? "border-primary bg-primary/[0.06] ring-1 ring-primary/20"
                    : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    isOn
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground group-hover:text-primary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{name}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                    isOn
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent group-hover:border-primary/40"
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        {/* OAuth connect flows are wired up in a later milestone (M2). */}
        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/create-workspace")}>
            Skip for now
          </Button>
          <Button onClick={() => router.push("/create-workspace")} className="group">
            Continue{connected.length > 0 ? ` (${connected.length})` : ""}
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}
