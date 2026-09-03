import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@growthos/ui/components/button";

export function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-ink-foreground sm:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Connect three channels. Get one queue.
          </h2>
          <p className="mt-5 text-ink-muted">
            Read-only connections, no card, and your first cross-channel recommendations in the
            same session.
          </p>
          <div className="mt-9 flex justify-center">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Start free
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
