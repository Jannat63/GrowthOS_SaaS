import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { ExchangeBoard } from "./ExchangeBoard";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-b from-primary/[0.07] to-transparent"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
            SEO <span className="text-border">/</span> GOOGLE ADS{" "}
            <span className="text-border">/</span> META ADS
          </p>

          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            A win in one channel becomes the{" "}
            <span className="whitespace-nowrap text-primary">next move</span> in another.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Google captures demand. Meta creates it. SEO sustains it. GrowthOS runs six
            bridges between them — so a converting search term writes an SEO brief, and a
            hook that beats 3% CTR becomes next week&rsquo;s article.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Start free
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#bridges">See the six bridges</Link>
            </Button>
          </div>

          <p className="mt-5 font-mono text-[11px] tracking-[0.1em] text-muted-foreground">
            14-DAY GROWTH TRIAL <span className="text-border">·</span> NO CARD{" "}
            <span className="text-border">·</span> READ-ONLY CONNECTIONS
          </p>
        </div>

        <ExchangeBoard />
      </div>
    </section>
  );
}
