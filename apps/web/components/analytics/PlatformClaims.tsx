"use client";
import { Scale } from "lucide-react";
import type { MerDashboard } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { cn } from "@/lib/utils/cn";
import { ratio, usd } from "./merFormat";

/**
 * What each platform says it earned, against what the business actually took.
 *
 * The page's subtitle has always claimed blended MER is "immune to platform attribution bias", but
 * nothing on it ever showed the bias - and a blended figure on its own cannot, because the whole
 * point is the *gap* between it and the platforms' own numbers. Google and Meta each count a
 * conversion they touched, so when both touched one, both bank it. Summed, their claims exceed the
 * revenue that actually landed, and the overlap is the size of the double-count.
 *
 * The numbers are each platform's `conversion_value` on the same REVENUE_FACTOR basis as the
 * blended figure, so the three are directly comparable rather than three different definitions of
 * revenue sitting next to each other.
 *
 * It states the overlap in words rather than drawing a Venn diagram: the reader needs one sentence
 * they can repeat in a budget meeting, not a shape they have to interpret.
 */
export function PlatformClaims({
  breakdown,
  blendedRevenue,
  blendedMer,
}: {
  breakdown: MerDashboard["channelBreakdown"];
  blendedRevenue: number;
  blendedMer: number;
}) {
  const claims = [
    {
      label: "Google Ads",
      revenue: breakdown.googleAdsRevenue,
      spend: breakdown.googleAdsSpend,
      bar: "bg-channel-google",
      text: "text-channel-google",
    },
    {
      label: "Meta Ads",
      revenue: breakdown.metaAdsRevenue,
      spend: breakdown.metaAdsSpend,
      bar: "bg-channel-meta",
      text: "text-channel-meta",
    },
  ];

  const claimed = claims.reduce((s, c) => s + c.revenue, 0);
  const overlap = claimed - blendedRevenue;
  // Only worth naming when the platforms genuinely over-claim. A workspace whose conversions never
  // touch both channels has no double-count, and inventing a note about one would be noise.
  const overClaims = overlap > 0 && blendedRevenue > 0;
  const overlapShare = overClaims ? Math.round((overlap / blendedRevenue) * 100) : 0;

  // The widest claim sets the scale, so the two bars are read against each other rather than each
  // against its own maximum.
  const widest = Math.max(claimed, blendedRevenue, 1);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Scale className="h-4 w-4 text-primary" aria-hidden />
          What each platform claims
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Each platform counts every conversion it touched, so a conversion both touched is banked
          twice.
        </p>
      </div>

      <dl className="mt-5 space-y-4">
        {claims.map((c) => (
          <div key={c.label}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <dt className="text-sm font-medium">{c.label}</dt>
              <dd className="flex items-baseline gap-2.5 font-mono tabular-nums">
                <span className={cn("text-sm font-semibold", c.text)}>
                  {c.spend > 0 ? `${ratio(c.revenue / c.spend)} ROAS` : "no spend"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {usd(c.revenue)} claimed on {usd(c.spend)}
                </span>
              </dd>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full", c.bar)}
                // Genuinely dynamic: the share of the widest claim on the panel.
                style={{ width: `${(c.revenue / widest) * 100}%` }}
              />
            </div>
          </div>
        ))}

        {/* The blended figure last and in the accent, because it is the one the business actually
            banked and the two above are measured against it. */}
        <div className="border-t pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
            <dt className="text-sm font-medium">Blended, what actually landed</dt>
            <dd className="flex items-baseline gap-2.5 font-mono tabular-nums">
              <span className="text-sm font-semibold text-primary">{ratio(blendedMer)} MER</span>
              <span className="text-[11px] text-muted-foreground">{usd(blendedRevenue)}</span>
            </dd>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(blendedRevenue / widest) * 100}%` }}
            />
          </div>
        </div>
      </dl>

      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
        {overClaims ? (
          <>
            Together the platforms claim{" "}
            <span className="font-medium text-foreground">{usd(claimed)}</span> against the{" "}
            <span className="font-medium text-foreground">{usd(blendedRevenue)}</span> that landed —{" "}
            <span className="font-medium text-warning">{usd(overlap)} counted twice</span>, {overlapShare}%
            of real revenue. Budget split on either platform&rsquo;s ROAS alone is split on that
            number.
          </>
        ) : (
          <>
            The platforms&rsquo; claims do not exceed what landed, so nothing here is double-counted
            over this window — the blended figure and the per-platform ones are telling the same
            story.
          </>
        )}
      </p>
    </Card>
  );
}
