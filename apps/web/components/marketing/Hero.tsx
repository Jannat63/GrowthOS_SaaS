import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { LoopDiagram } from "@/components/marketing/LoopDiagram";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            SEO · Google Ads · Meta Ads, on one loop
          </span>

          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Your channels,
            <br />
            finally{" "}
            <span className="relative whitespace-nowrap text-primary">
              talking to each other
              <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-success/70" />
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Most teams run SEO, Google Ads, and Meta in three separate tabs.
            GrowthOS connects them into one loop — a win in one channel becomes
            the next move in another, ranked by impact.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link href="/sign-up">
                Start free
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how">See how the loop works</Link>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            No credit card · Connect your first channel in minutes
          </p>
        </div>

        <div className="lg:pl-4">
          <LoopDiagram />
        </div>
      </div>
    </section>
  );
}
