import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { CHANNELS } from "@/components/marketing/channels";
import { InlineCTA } from "@/components/marketing/InlineCTA";

export const metadata = pageMeta({
  title: "About",
  description:
    "Why GrowthOS treats SEO, Google Ads, and Meta Ads as one system rather than three tools, and what that means for how it is built.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <p className="font-mono text-[11px] tracking-[0.18em] text-primary">ABOUT</p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-[1.12] tracking-tight">
        Three channels, one customer, no tool that saw all of it
      </h1>

      <div className="mt-10 space-y-6 text-lg leading-[1.7] text-muted-foreground">
        <p>
          Someone finds a brand in a Meta feed. Days later they search the category and read a
          blog post. Later still they search the brand by name and click a paid result. Then
          they buy.
        </p>
        <p>
          That is one person and one decision. It gets recorded as three unrelated events in
          three tools that cannot see each other, and every one of those tools takes credit for
          the sale on its own terms. This is the reason marketing reporting so rarely adds up,
          and the reason the same argument about attribution happens every month.
        </p>
        <p className="text-foreground">
          GrowthOS is built on the assumption that these are not three channels. They are three
          stages of one journey, and the useful software sits in the gaps between them.
        </p>
      </div>

      <InlineCTA />

      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-3">
        {Object.values(CHANNELS).map((c) => (
          <div key={c.id} className="bg-card p-6">
            <c.icon className={`h-5 w-5 ${c.text}`} aria-hidden="true" />
            <p className="mt-4 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
              {c.short}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed">
              {c.id === "seo" && "Sustains demand once it exists."}
              {c.id === "google" && "Captures demand at the moment it appears."}
              {c.id === "meta" && "Creates demand that did not exist yet."}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-16 font-display text-2xl font-bold tracking-tight">
        What we decided not to build
      </h2>
      <div className="mt-6 space-y-6 leading-[1.7] text-muted-foreground">
        <p>
          The temptation with a platform this broad is to claim everything and ship a thin
          version of all of it. We have tried to do the opposite, and it means some absences are
          deliberate.
        </p>
        <p>
          There is no performance prediction, because an honest forecast needs a trained model
          and the data to train it — and a confident-looking number that is really a guess is
          worse than no number. What exists instead is a scorecard that grades creative against
          your own historical median, retrospectively, on work that actually ran.
        </p>
        <p>
          Generated copy is deterministic and constrained by the brand rules you set, rather
          than a language model improvising fresh each time. It produces structured starting
          points, not finished publishable work, and we would rather say that than imply
          otherwise.
        </p>
        <p>
          Connections are read-only. GrowthOS can recommend a budget shift and queue it for your
          approval; it cannot reach into your ad account and spend your money.
        </p>
      </div>

      <h2 className="mt-16 font-display text-2xl font-bold tracking-tight">Where it is going</h2>
      <p className="mt-6 leading-[1.7] text-muted-foreground">
        The six bridges are live and the intelligence rules behind them keep growing. The work
        ahead is depth rather than breadth: more signal on each bridge, richer attribution
        comparison, and eventually execution into the ad platforms themselves — which waits on
        platform approval rather than on us.
      </p>

      <div className="mt-14 rounded-2xl border bg-muted/40 p-8">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          See it against your own accounts
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          14 days of Growth-tier features, read-only connections, no card.
        </p>
        <Button asChild className="mt-6">
          <Link href="/sign-up">
            Start free
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
