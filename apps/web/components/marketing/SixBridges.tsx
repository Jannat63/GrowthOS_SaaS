import { ArrowRight } from "lucide-react";
import { BRIDGES, CHANNELS } from "./channels";

/**
 * Deliberately unnumbered. The six bridges are a set, not a sequence — they run concurrently and
 * in both directions, so 01/02/03 markers would assert an order that does not exist. (HowItWorks
 * is numbered, because connect → score → ship genuinely is one.)
 */
export function SixBridges() {
  return (
    <section id="bridges" className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] tracking-[0.18em] text-primary">THE EXCHANGE</p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Six bridges, running both ways
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          Three channels, every pair connected in both directions. Each bridge is a standing rule:
          when the signal on the left fires, the work on the right lands in your queue, already
          scored against everything else waiting.
        </p>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BRIDGES.map((b) => {
          const from = CHANNELS[b.from];
          const to = CHANNELS[b.to];
          return (
            <article
              key={`${b.from}-${b.to}`}
              className="group relative flex flex-col rounded-xl border bg-card p-6 shadow-xs transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em]">
                <span className={from.text}>{from.short}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/60" aria-hidden="true" />
                <span className={to.text}>{to.short}</span>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">{b.trigger}</p>
              <p className="mt-1.5 font-display text-lg font-semibold leading-snug tracking-tight">
                {b.result}
              </p>
              <p className="mt-4 border-t pt-4 text-sm leading-relaxed text-muted-foreground">
                {b.detail}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
