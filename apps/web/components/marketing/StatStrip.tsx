const STATS = [
  { value: "3 → 1", label: "channels into one loop" },
  { value: "47", label: "cross-channel plays scored" },
  { value: "0", label: "dashboards to switch between" },
  { value: "4×/day", label: "the loop re-checks itself" },
];

export function StatStrip() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-6 py-10 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="px-2 text-center sm:text-left">
            <p className="font-display text-3xl font-bold tracking-tight text-primary">
              {s.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
