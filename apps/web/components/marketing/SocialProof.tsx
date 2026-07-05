export function SocialProof() {
  return (
    <section className="bg-ink text-ink-foreground">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <figure>
            <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
              Trusted by growth teams
            </p>
            <blockquote className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              &ldquo;GrowthOS turned three dashboards we were always tab-switching
              between into one place we actually make decisions from.&rdquo;
            </blockquote>
            <figcaption className="mt-6 text-ink-muted">
              Placeholder Name · Head of Growth, Placeholder Co.
            </figcaption>
          </figure>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-border">
            {[
              { v: "31%", l: "lower blended CAC" },
              { v: "2.4×", l: "more briefs shipped" },
              { v: "6 hrs", l: "saved per week" },
              { v: "1", l: "source of truth" },
            ].map((s) => (
              <div key={s.l} className="bg-ink-2 p-6">
                <p className="font-display text-3xl font-bold tracking-tight text-ink-foreground">
                  {s.v}
                </p>
                <p className="mt-1 text-sm text-ink-muted">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
