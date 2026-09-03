import { ArrowRight, Check, TrendingDown } from "lucide-react";
import { CHANNELS } from "./channels";
import { cn } from "@/lib/utils/cn";

/**
 * The product, shown rather than described.
 *
 * These are built from the same tokens as the app rather than captured as screenshots: they
 * re-tone with the theme for free, they cannot drift out of date against a UI change, and there
 * is no image weight. Every panel mirrors a surface that has actually shipped — the
 * recommendation queue, Blended MER, the content pipeline, and the fatigue monitor.
 *
 * Figures are illustrative and labelled as such, matching the DataSourceBadge convention the
 * dashboard uses for seeded data.
 */

function Panel({
  module,
  children,
  className,
}: {
  module: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-lg", className)}>
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
          {module}
        </span>
        <span className="rounded-full bg-warning/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-warning">
          SAMPLE
        </span>
      </div>
      {children}
    </div>
  );
}

const QUEUE = [
  {
    score: 94,
    from: "google" as const,
    to: "seo" as const,
    title: "Brief “best retinol for sensitive skin”",
    note: "41 paid conversions · no organic page ranking",
  },
  {
    score: 81,
    from: "meta" as const,
    to: null,
    title: "Rotate the “3-week results” hook",
    note: "CTR down 38% since Tuesday · 19 days live",
  },
  {
    score: 73,
    from: "seo" as const,
    to: "meta" as const,
    title: "Widen audience from /guides/retinol-purging",
    note: "Top-3 for nine weeks · 2,140 monthly clicks",
  },
  {
    score: 58,
    from: "google" as const,
    to: null,
    title: "Pause six terms with zero conversions",
    note: "$412/mo recovered · 90-day window",
  },
];

function RecommendationQueue() {
  return (
    <Panel module="RECOMMENDATIONS">
      <ul className="divide-y">
        {QUEUE.map((r) => {
          const from = CHANNELS[r.from];
          const to = r.to ? CHANNELS[r.to] : null;
          return (
            <li key={r.title} className="flex gap-4 px-4 py-3.5">
              <span className="mt-0.5 w-8 shrink-0 font-display text-lg font-bold tabular text-primary">
                {r.score}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em]">
                  <span className={from.text}>{from.short}</span>
                  {to && (
                    <>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50" aria-hidden="true" />
                      <span className={to.text}>{to.short}</span>
                    </>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-medium">{r.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.note}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

const MER_POINTS = [2.6, 2.4, 2.9, 2.8, 3.1, 3.0, 3.3, 3.2, 3.5, 3.4, 3.7, 3.6];
const MER_SPLIT = [
  { id: "seo" as const, label: "Organic", pct: 44 },
  { id: "google" as const, label: "Google Ads", pct: 34 },
  { id: "meta" as const, label: "Meta Ads", pct: 22 },
];

function BlendedMer() {
  const max = Math.max(...MER_POINTS);
  const min = Math.min(...MER_POINTS);
  const pts = MER_POINTS.map((v, i) => {
    const x = (i / (MER_POINTS.length - 1)) * 260;
    const y = 64 - ((v - min) / (max - min)) * 56;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <Panel module="BLENDED MER">
      <div className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-5xl font-bold tracking-tight tabular">3.6×</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Revenue per blended marketing dollar
            </p>
          </div>
          <span className="rounded-full bg-success/10 px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-success">
            +0.4 · 30D
          </span>
        </div>

        <svg viewBox="0 0 260 72" className="mt-5 h-20 w-full overflow-visible" aria-hidden="true">
          <polyline
            points={pts}
            fill="none"
            stroke="var(--color-success)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="mt-5 space-y-2.5 border-t pt-4">
          {MER_SPLIT.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <span className="w-20 shrink-0 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
                {s.label.toUpperCase()}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${s.pct}%`, background: CHANNELS[s.id].cssVar }}
                />
              </span>
              <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular text-muted-foreground">
                {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

const TERMS = [
  { term: "retinol for sensitive skin", conv: 41, cost: "$1,284", rank: "—" },
  { term: "does retinol cause purging", conv: 12, cost: "$389", rank: "—" },
  { term: "beginner retinol routine", conv: 9, cost: "$276", rank: "18" },
];

function ContentPipeline() {
  return (
    <Panel module="CONTENT PIPELINE">
      <div className="p-5">
        <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
          PAID TERMS CONVERTING WITHOUT AN ORGANIC PAGE
        </p>
        <table className="mt-3 w-full text-left text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="pb-2 font-normal">Search term</th>
              <th className="pb-2 text-right font-normal">Conv</th>
              <th className="pb-2 text-right font-normal">Cost</th>
              <th className="pb-2 text-right font-normal">Rank</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {TERMS.map((t) => (
              <tr key={t.term}>
                <td className="py-2 pr-2">{t.term}</td>
                <td className="py-2 text-right tabular">{t.conv}</td>
                <td className="py-2 text-right tabular text-muted-foreground">{t.cost}</td>
                <td
                  className={cn(
                    "py-2 text-right tabular",
                    t.rank === "—" ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {t.rank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em]">
            <span className={CHANNELS.google.text}>GOOGLE</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50" aria-hidden="true" />
            <span className={CHANNELS.seo.text}>SEO</span>
            <span className="ml-auto text-muted-foreground">BRIEF DRAFTED</span>
          </div>
          <p className="mt-2.5 font-display text-sm font-semibold">
            Retinol for sensitive skin: how to start without the purge
          </p>
          <ul className="mt-2.5 space-y-1 text-xs text-muted-foreground">
            {["Target: retinol for sensitive skin", "Cover purging, buffering, frequency", "Internal link → /guides/retinol-purging"].map(
              (line) => (
                <li key={line} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" aria-hidden="true" />
                  {line}
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

const CREATIVES = [
  { name: "Before / After — 3 weeks", days: 19, fatigue: 84, state: "rotate" },
  { name: "Dermatologist explains", days: 11, fatigue: 52, state: "watch" },
  { name: "UGC — morning routine", days: 4, fatigue: 18, state: "healthy" },
];

function FatigueMonitor() {
  return (
    <Panel module="FATIGUE MONITOR">
      <ul className="divide-y">
        {CREATIVES.map((c) => {
          const tone =
            c.fatigue >= 75 ? "destructive" : c.fatigue >= 45 ? "warning" : "success";
          return (
            <li key={c.name} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] tracking-[0.12em]",
                    tone === "destructive" && "bg-destructive/10 text-destructive",
                    tone === "warning" && "bg-warning/10 text-warning",
                    tone === "success" && "bg-success/10 text-success"
                  )}
                >
                  {c.state.toUpperCase()}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      tone === "destructive" && "bg-destructive",
                      tone === "warning" && "bg-warning",
                      tone === "success" && "bg-success"
                    )}
                    style={{ width: `${c.fatigue}%` }}
                  />
                </span>
                <span className="w-24 shrink-0 text-right font-mono text-[10px] tabular text-muted-foreground">
                  {c.fatigue}% · {c.days}D LIVE
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-start gap-2 border-t bg-muted/40 px-5 py-3.5">
        <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Fatigue is called before the spend curve turns, so the replacement hook is briefed
          while the ad is still profitable.
        </p>
      </div>
    </Panel>
  );
}

const SURFACES = [
  {
    eyebrow: "ONE QUEUE",
    title: "Every opportunity, scored against every other",
    body: "Recommendations from all three channels land in one ranked list with the reasoning attached. No tab has its own to-do list, so nothing wins attention just because you happened to open it.",
    panel: <RecommendationQueue />,
  },
  {
    eyebrow: "ONE NUMBER",
    title: "Blended MER, not five arguments",
    body: "One efficiency figure across paid and organic, with the channel split underneath it. When it moves, the anomaly detector says which channel moved it — before the monthly report does.",
    panel: <BlendedMer />,
  },
  {
    eyebrow: "PAID → ORGANIC",
    title: "Search terms you already paid to validate",
    body: "The bridge finds terms converting on paid with no organic page behind them, then drafts the brief. You stop renting a click you could own.",
    panel: <ContentPipeline />,
  },
  {
    eyebrow: "CREATIVE",
    title: "Fatigue called early, with the next hook ready",
    body: "Meta creative decays inside days, not weeks. The monitor watches for the turn and pulls the replacement angle from whatever is currently working organically.",
    panel: <FatigueMonitor />,
  },
];

export function ProductSurfaces() {
  return (
    <section id="product" className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] tracking-[0.18em] text-primary">THE PRODUCT</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            What the bridges actually put in front of you
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Four of the surfaces you work in. Every figure below is sample data — the shapes are
            the real ones.
          </p>
        </div>

        <div className="mt-16 space-y-20">
          {SURFACES.map((s) => (
            <div key={s.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
                  {s.eyebrow}
                </p>
                <h3 className="mt-3 font-display text-2xl font-bold leading-snug tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-4 leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
              {s.panel}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
