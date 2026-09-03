import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { FaqList } from "@/components/marketing/FAQ";
import { FAQ } from "@/components/marketing/faq-data";
import { InlineCTA } from "@/components/marketing/InlineCTA";

export const metadata = pageMeta({
  title: "FAQ",
  description:
    "What GrowthOS connects to, how it differs from SEO and attribution tools, what the trial includes, and where your data lives.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <p className="font-mono text-[11px] tracking-[0.18em] text-primary">FAQ</p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight">
        Questions, answered plainly
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
        If something here is unclear or missing, the fastest answer is usually the trial — it
        runs on your own accounts without a card.
      </p>

      <InlineCTA />

      <div className="mt-14">
        <FaqList items={FAQ} />
      </div>

      <div className="mt-14 rounded-2xl border bg-muted/40 p-8">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Still deciding?
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Connect one channel and see what the bridges surface. You can disconnect it again from
          settings, which deletes the stored token immediately.
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
