/** Drawn from the three PRD personas — Alex, Sarah, Marcus — written as situations rather than
 *  job titles, so a visitor can recognise themselves without matching a label. */
const AUDIENCES = [
  {
    who: "Freelancers & small agencies",
    pain: "A quarter of your billable hours go to reporting, and you still can't show a client how organic supported the paid number.",
    win: "One workspace per brand, white-label reports, and cross-channel proof a client understands without a call.",
  },
  {
    who: "Owners running it themselves",
    pain: "You're spending real money on ads without knowing which part works, and the tools you tried assumed you already knew.",
    win: "A ranked list that says what to do next and why, instead of a dashboard that assumes you'll figure it out.",
  },
  {
    who: "In-house growth teams",
    pain: "Data lives in five places, leadership doesn't trust the attribution, and the enterprise fix costs more than a headcount.",
    win: "One source of truth per channel, with a blended number you can defend in a board deck.",
  },
];

export function WhoItsFor() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] tracking-[0.18em] text-primary">WHO IT&rsquo;S FOR</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Built for the person holding all three channels
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.who} className="rounded-xl border bg-card p-7 shadow-xs">
              <h3 className="font-display text-lg font-semibold tracking-tight">{a.who}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{a.pain}</p>
              <p className="mt-4 border-t pt-4 text-sm leading-relaxed">{a.win}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
