import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@growthos/ui/components/button";

export function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center text-ink-foreground sm:px-16">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Close the loop between your channels
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-muted">
            Connect SEO, Google Ads, and Meta in minutes and see your first
            cross-channel plays today.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="group">
              <Link href="/sign-up">
                Start free
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
