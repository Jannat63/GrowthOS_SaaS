const REPORTS = [
  { source: "Ads platform", metric: "4.2×", label: "reported ROAS", note: "last-click, its own clicks only" },
  { source: "Social platform", metric: "6.8×", label: "reported ROAS", note: "7-day click, 1-day view" },
  { source: "Your analytics", metric: "2.1×", label: "reported ROAS", note: "session-scoped, cookie-limited" },
];

export function TheProblem() {
  return (
    <section className="bg-ink text-ink-foreground">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-mono text-[11px] tracking-[0.18em] text-ink-muted">THE PROBLEM</p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Three dashboards, three answers, one week of spend.
        </h2>
        <p className="mt-5 max-w-2xl text-ink-muted">
          Every platform grades its own homework on its own attribution window. So the same
          campaign comes back a winner in one tab and a write-off in another, and the argument
          about which number is right eats the afternoon.
        </p>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-ink-border bg-ink-border sm:grid-cols-3">
          {REPORTS.map((r) => (
            <div key={r.source} className="bg-ink-2 p-7">
              <p className="font-mono text-[11px] tracking-[0.14em] text-ink-muted">
                {r.source.toUpperCase()}
              </p>
              <p className="mt-5 font-display text-4xl font-bold tracking-tight tabular">
                {r.metric}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{r.label}</p>
              <p className="mt-4 border-t border-ink-border pt-4 text-xs leading-relaxed text-ink-muted">
                {r.note}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-10 border-t border-ink-border pt-10 sm:grid-cols-2">
          <div>
            <p className="font-display text-2xl font-bold tracking-tight">
              7+ tools, none of which talk
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              A marketer running all three channels juggles seven or more subscriptions, then
              spends roughly 40% of the week reconciling figures that were never going to match.
            </p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold tracking-tight">
              Solved already — at $50k a year
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Enterprise attribution platforms fixed this a decade ago for companies that can
              sign a five-figure contract. Below that line, nothing exists. That is the gap
              GrowthOS is built for.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
