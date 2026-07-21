"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PartyPopper, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import type { OnboardingStatusResponse } from "@growthos/types";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@growthos/ui/components/button";
import { api } from "@/lib/api/client";
import { useJob } from "@/lib/hooks/useJob";

export default function OnboardingCompletePage() {
  return (
    <Suspense fallback={null}>
      <OnboardingCompleteContent />
    </Suspense>
  );
}

function OnboardingCompleteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const ws = params.get("ws");
  const job = params.get("job");
  const [finishing, setFinishing] = useState(false);

  const jobQuery = useJob(ws, job);
  const status = jobQuery.data?.status;

  const analysis = useQuery<OnboardingStatusResponse>({
    queryKey: ["onboarding", ws],
    enabled: Boolean(ws) && status === "complete",
    queryFn: () => api.get<OnboardingStatusResponse>(`/workspaces/${ws}/onboarding`),
  });

  async function finish() {
    setFinishing(true);
    try {
      if (ws) await api.post(`/workspaces/${ws}/onboarding/complete`, {});
    } catch {
      // non-blocking — head to the dashboard regardless
    }
    router.push("/growth-hub");
  }

  // No analysis in flight (direct nav) → the simple ready screen.
  if (!ws || !job) {
    return (
      <OnboardingShell step={4}>
        <Card>
          <Badge tone="success">
            <PartyPopper className="h-7 w-7" />
          </Badge>
          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
            Your workspace is ready
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            GrowthOS is scanning your channels for the first cross-channel plays.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="group">
              <Link href="/growth-hub">
                Go to dashboard
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </Card>
      </OnboardingShell>
    );
  }

  // Job failed → surface + let them continue anyway.
  if (status === "failed") {
    return (
      <OnboardingShell step={4}>
        <Card>
          <Badge tone="destructive">
            <AlertCircle className="h-7 w-7" />
          </Badge>
          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
            We couldn&rsquo;t finish the analysis
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            {jobQuery.data?.error ?? "Something went wrong while analyzing your site."} You can head to
            your dashboard and try again later.
          </p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={finish} disabled={finishing} className="group">
              {finishing && <Loader2 className="animate-spin" />}
              Go to dashboard
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </Card>
      </OnboardingShell>
    );
  }

  // Analysis still running.
  if (status !== "complete") {
    const progress = jobQuery.data?.progress ?? 0;
    return (
      <OnboardingShell step={4}>
        <Card>
          <Badge tone="primary">
            <Loader2 className="h-7 w-7 animate-spin" />
          </Badge>
          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
            Building your growth plan
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Analyzing your site and drafting a channel-mix + 90-day plan…
          </p>
          <div className="mx-auto mt-6 h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.max(progress, 8)}%` }}
            />
          </div>
        </Card>
      </OnboardingShell>
    );
  }

  // Complete → review the strategy.
  const strategy = analysis.data?.analysis?.strategy;
  return (
    <OnboardingShell step={4}>
      <div className="rounded-2xl border bg-card p-8 shadow-lg shadow-black/[0.03] dark:shadow-black/20">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Your growth plan</h1>
        {strategy ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">{strategy.summary}</p>

            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recommended channel mix
              </h2>
              <div className="mt-3 space-y-3">
                {strategy.channelMix.map((c) => (
                  <div key={c.channel} className="flex items-center gap-3">
                    <span className="w-28 text-sm font-medium capitalize">
                      {c.channel.replace(/_/g, " ")}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${c.allocationPct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                      {c.allocationPct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                First 90 days
              </h2>
              <ol className="mt-3 space-y-3">
                {strategy.ninetyDayPlan.map((p) => (
                  <li key={p.phase} className="rounded-xl border p-4">
                    <p className="text-sm font-semibold">{p.phase}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.focus}</p>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Your plan is ready.</p>
        )}

        <div className="mt-8 flex justify-end">
          <Button size="lg" onClick={finish} disabled={finishing} className="group">
            {finishing && <Loader2 className="animate-spin" />}
            Looks good — go to dashboard
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center shadow-lg shadow-black/[0.03] dark:shadow-black/20">
      {children}
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "primary" | "destructive";
}) {
  const tones = {
    success: "bg-success/10 text-success ring-success/5",
    primary: "bg-primary/10 text-primary ring-primary/5",
    destructive: "bg-destructive/10 text-destructive ring-destructive/5",
  } as const;
  return (
    <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-8 ${tones[tone]}`}>
      {children}
    </span>
  );
}
