"use client";
import {
  channelLabel,
  type AttributionModel,
  type ChannelRole,
  type ChannelSpread,
} from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { cn } from "@/lib/utils/cn";
import { MODEL_LABELS, MODELS, prose, usd } from "./models";

/**
 * A round number at or above the data, so the axis reads in figures a person
 * would say out loud. $735 becomes $750; $1,240 becomes $1,500.
 */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

/** Below this share of the axis a band is too narrow to letter without collision. */
const LABEL_THRESHOLD = 0.22;

const pct = (share: number) => `${Math.round(share * 100)}%`;

function extremes(spread: ChannelSpread) {
  const low = MODELS.reduce(
    (lo, m) => (spread.byModel[m.key] < spread.byModel[lo.key] ? m : lo),
    MODELS[0]!,
  );
  const high = MODELS.reduce(
    (hi, m) => (spread.byModel[m.key] > spread.byModel[hi.key] ? m : hi),
    MODELS[0]!,
  );
  return { low, high };
}

/** "It opens 3 of the 10 paths and closes none." — the reason a channel's credit swings. */
function roleSentence(role: ChannelRole | undefined, pathCount: number): string {
  if (!role) return "";
  if (role.closes === 0) return `It opens ${role.opens} of the ${pathCount} paths and closes none.`;
  if (role.opens === 0) return `It closes ${role.closes} of the ${pathCount} paths and opens none.`;
  return `It opens ${role.opens} and closes ${role.closes} of the ${pathCount} paths.`;
}

/**
 * Every channel's credit range across all five models, on one shared scale.
 *
 * This replaces a bar chart of the selected model, which answered the wrong
 * question twice over. Bars encode a magnitude, but the quantity that decides
 * anything here is a *range*: a channel whose credit barely moves between models
 * is one you can budget against, and a channel that swings by 40% of all revenue
 * is one whose number is a property of a setting rather than of the business. A
 * range needs two endpoints, which a bar does not have.
 *
 * Three deliberate choices:
 *
 * - **One scale for every row.** The bar chart normalised each view to its own
 *   largest channel, so the leading channel always filled the row completely and
 *   nothing could be compared across channels or across models. Here $0 is the
 *   left edge and the same dollar is the same distance on every track, which is
 *   what makes a wide band mean something.
 * - **Ember means the selected model, and nothing else, anywhere on the page.**
 *   The other four models stay as neutral ticks. Switching models slides every
 *   marker at once, so credit is seen moving between channels rather than
 *   inferred from two sets of numbers read minutes apart.
 * - **Ordered by swing, not by revenue.** The ordering is the argument: the rows
 *   at the top are the ones a budget decision is least safe on.
 */
export function CreditSpread({
  spread,
  roles,
  selected,
  totalRevenue,
  pathCount,
}: {
  spread: ChannelSpread[];
  roles: Record<string, ChannelRole>;
  selected: AttributionModel;
  totalRevenue: number;
  pathCount: number;
}) {
  const axisMax = niceMax(Math.max(...spread.map((s) => s.max), 0));
  const headline = spread[0];
  const settled = !headline || headline.swing === 0;

  return (
    <Card className="p-6">
      <header className="max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Credit at risk
        </p>
        {headline && !settled ? (
          <>
            <h2 className="mt-1.5 text-balance font-display text-xl font-semibold tracking-tight">
              {channelLabel(headline.channel)} is credited anywhere from{" "}
              <span className="text-primary">{usd(headline.min)}</span> to{" "}
              <span className="text-primary">{usd(headline.max)}</span> — {pct(headline.swingShare)}{" "}
              of all attributed revenue, decided by the model alone.
            </h2>
            {/* The model names are lowercased for prose, so neither may open a
                sentence — "last click gives it the least" reads as a typo. */}
            <p className="mt-2 text-sm text-muted-foreground">
              Least under {prose(extremes(headline).low.label)}, most under{" "}
              {prose(extremes(headline).high.label)}.{" "}
              {roleSentence(roles[headline.channel], pathCount)} No model is more correct than the
              others — they answer different questions about the same {usd(totalRevenue)}.
            </p>
          </>
        ) : (
          <h2 className="mt-1.5 font-display text-xl font-semibold tracking-tight">
            Every model agrees on this data.
          </h2>
        )}
      </header>

      <ul className="mt-7 space-y-5">
        {spread.map((s) => {
          const value = s.byModel[selected];
          const { low, high } = extremes(s);
          const role = roles[s.channel];
          const minPct = (s.min / axisMax) * 100;
          const maxPct = (s.max / axisMax) * 100;
          const showEnds = (s.max - s.min) / axisMax >= LABEL_THRESHOLD;

          return (
            <li key={s.channel}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="text-sm font-medium">{channelLabel(s.channel)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    opens {role?.opens ?? 0} · closes {role?.closes ?? 0} · in {role?.paths ?? 0} of{" "}
                    {pathCount}
                  </span>
                </div>
                <div className="flex items-baseline gap-2.5 font-mono tabular-nums">
                  <span className="text-sm font-semibold text-primary">{usd(value)}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {s.swing > 0 ? `swing ${usd(s.swing)} · ${pct(s.swingShare)}` : "no swing"}
                  </span>
                </div>
              </div>

              {/* Inset by half a marker so a channel worth $0 under some model still
                  draws a whole dot instead of a clipped half at the card edge. */}
              <div className="mt-1.5 px-1.5">
                <div
                  className="relative h-9"
                  role="img"
                  aria-label={`${channelLabel(s.channel)}: ${usd(value)} under ${prose(MODEL_LABELS[selected])}. Ranges from ${usd(s.min)} under ${prose(low.label)} to ${usd(s.max)} under ${prose(high.label)}.`}
                >
                  {/* Three weights, because there are three things to tell apart:
                      the lane is the whole axis, the band is the contested range,
                      and the dot is the current answer. A hairline lane and a 20%
                      band were within a shade of each other on graphite and both
                      disappeared into white paper — the band's *width* is the
                      message, so it has to be the second-heaviest mark on the row. */}
                  <div className="absolute inset-x-0 top-2 h-2 rounded-full bg-secondary" aria-hidden />

                  {/* Neutral on purpose: ember is reserved for the selection. */}
                  <div
                    className="absolute top-2 h-2 rounded-full bg-muted-foreground/40"
                    style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 0)}%` }}
                    aria-hidden
                  />

                  {MODELS.map((m) => (
                    <span
                      key={m.key}
                      className="absolute top-2 h-2 w-px bg-card/70"
                      style={{ left: `${(s.byModel[m.key] / axisMax) * 100}%` }}
                      aria-hidden
                    />
                  ))}

                  <span
                    className={cn(
                      "absolute top-3 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
                      "bg-primary ring-2 ring-card",
                      "transition-[left] duration-500 ease-out motion-reduce:transition-none",
                    )}
                    style={{ left: `${(value / axisMax) * 100}%` }}
                    aria-hidden
                  />

                  {/* Which model sits at each end, lettered only where the band is
                      wide enough to hold it — a band too narrow to letter is also a
                      channel with no story to tell.
                      `showEnds` is a share of the axis, which is resolution-free,
                      but the labels are a fixed number of pixels: on a phone the
                      two ran into each other and printed "Last clFirst click", so
                      below `sm` the row keeps the figures and drops the annotation. */}
                  {showEnds && (
                    <>
                      <span
                        className="absolute top-[21px] hidden font-mono text-[10px] text-muted-foreground sm:block"
                        style={{ left: `${minPct}%` }}
                      >
                        {low.label}
                      </span>
                      <span
                        className="absolute top-[21px] hidden font-mono text-[10px] text-muted-foreground sm:block"
                        style={{ right: `${100 - maxPct}%` }}
                      >
                        {high.label}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 px-1.5">
        <div className="relative h-5 border-t border-border pt-1.5">
          <span className="absolute left-0 font-mono text-[10px] text-muted-foreground">
            {usd(0)}
          </span>
          <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[10px] text-muted-foreground">
            {usd(axisMax / 2)}
          </span>
          <span className="absolute right-0 font-mono text-[10px] text-muted-foreground">
            {usd(axisMax)}
          </span>
        </div>
      </div>
      <p className="mt-2.5 text-xs text-muted-foreground">
        Attributed revenue, same scale on every row. Ticks mark all five models; the filled dot is
        the one selected above.
      </p>
    </Card>
  );
}
