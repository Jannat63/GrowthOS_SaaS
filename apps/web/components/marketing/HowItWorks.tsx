const STEPS = [
  {
    n: "01",
    title: "Connect read-only",
    body: "Search Console, Google Ads, Meta, and your store. Read-only scopes, a few clicks each — GrowthOS never gets permission to spend your money.",
  },
  {
    n: "02",
    title: "The bridges score everything",
    body: "All three channels are read together, every cross-channel opportunity is scored against the others, and the queue sorts itself by impact.",
  },
  {
    n: "03",
    title: "Ship the top of the list",
    body: "A brief, a budget shift, a creative rotation. Act on it, and the next pass re-scores against what changed.",
  },
];

/**
 * Numbered, unlike the six bridges — connect → score → ship is a real sequence where the order
 * carries information the reader needs. Markers earn their place here; they would not there.
 */
export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] tracking-[0.18em] text-primary">HOW IT WORKS</p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          From connected to compounding in three steps
        </h2>
      </div>

      <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="bg-card p-7">
            <span className="font-mono text-xs tracking-[0.16em] text-primary">{s.n}</span>
            <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
