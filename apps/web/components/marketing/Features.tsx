import {
  Repeat,
  Search,
  MousePointerClick,
  Megaphone,
  LineChart,
  ListChecks,
  ArrowRight,
} from "lucide-react";

const HANDOFFS = [
  "A converting Google search term → an SEO content brief",
  "A page ranking #3 → a Meta creative to defend it",
  "A fatiguing ad's hook → next week's blog angle",
];

const CELLS = [
  {
    icon: Search,
    title: "SEO",
    body: "Rank tracking, audits, and briefs that know what your paid data is already buying.",
    tone: "success" as const,
    span: "lg:col-span-3",
  },
  {
    icon: MousePointerClick,
    title: "Google Ads",
    body: "Search-term mining and wasted-spend detection that feed straight back into content.",
    tone: "primary" as const,
    span: "lg:col-span-3",
  },
  {
    icon: Megaphone,
    title: "Meta Ads",
    body: "Creative fatigue alerts before performance drops, with the next hook suggested.",
    tone: "primary" as const,
    span: "lg:col-span-2",
  },
  {
    icon: LineChart,
    title: "Blended MER",
    body: "One efficiency number across every channel — not five dashboards that disagree.",
    tone: "success" as const,
    span: "lg:col-span-2",
  },
  {
    icon: ListChecks,
    title: "Ranked to-do list",
    body: "Every opportunity scored by impact, so you always know the next best move.",
    tone: "primary" as const,
    span: "lg:col-span-2",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          The product
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Built around the loop, not the channel
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Every part of GrowthOS exists to turn one channel&rsquo;s signal into
          another channel&rsquo;s action.
        </p>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-6">
        {/* Flagship */}
        <div className="flex flex-col justify-between rounded-2xl border bg-card p-8 shadow-sm lg:col-span-3 lg:row-span-2">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Repeat className="h-5 w-5" />
            </span>
            <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight">
              The insight loop
            </h3>
            <p className="mt-3 text-muted-foreground">
              The engine watches all three channels at once and hands work
              between them automatically:
            </p>
          </div>
          <ul className="mt-6 space-y-3">
            {HANDOFFS.map((h) => (
              <li
                key={h}
                className="flex items-start gap-3 rounded-xl border bg-background p-3 text-sm"
              >
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {CELLS.map(({ icon: Icon, title, body, tone, span }) => (
          <div
            key={title}
            className={`rounded-2xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/40 ${span}`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                tone === "success"
                  ? "bg-success/10 text-success"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
