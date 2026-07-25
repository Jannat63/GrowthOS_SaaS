const STEPS = [
  {
    n: "01",
    title: "Connect your channels",
    body: "Link Google Ads, Search Console, Meta, and your store. Read-only, a few clicks each.",
  },
  {
    n: "02",
    title: "The loop scores everything",
    body: "GrowthOS reads all channels together and ranks every cross-channel opportunity by impact.",
  },
  {
    n: "03",
    title: "Ship the next best move",
    body: "Act on the top of the list — a brief, a budget shift, a creative refresh — and the loop updates.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            From connected to compounding in three steps
          </h2>
        </div>

        <ol className="relative mt-14 grid gap-10 sm:grid-cols-3">
          {/* connecting line */}
          <div className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px bg-border sm:block" />
          {STEPS.map((s) => (
            <li key={s.n} className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background font-display text-sm font-bold text-primary">
                {s.n}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
