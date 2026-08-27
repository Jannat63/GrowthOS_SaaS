"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ScoredSearchTerm } from "@growthos/types";
import { Badge } from "@growthos/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@growthos/ui/components/table";
import { cn } from "@/lib/utils/cn";
import { briefAnchorId, costPerConversion, usdPrecise } from "./briefText";

/**
 * The three verdicts the bridge engine reaches, with the colour each one earns.
 *
 * "Reduce bid" was rendered in muted grey, which reads as "nothing to see". It is the opposite:
 * money being spent on a term the site already ranks top-3 for. Gold, because it is waste, not an
 * error.
 */
const SIGNAL: Record<
  string,
  { label: string; variant: "default" | "warning" | "muted"; blurb: string }
> = {
  "paid-proven-organic-needed": {
    label: "Write this",
    variant: "default",
    blurb: "Converts on paid, ranks nowhere organically.",
  },
  "reduce-bid-organic-covers": {
    label: "Reduce bid",
    variant: "warning",
    blurb: "Already ranking top-3 — you are paying for traffic you own.",
  },
  monitor: { label: "Monitor", variant: "muted", blurb: "No action yet." },
};

export function SearchTermsTable({
  terms,
  /** Recommendation id per opportunity term, so a row can jump to its brief. */
  briefAnchors,
}: {
  terms: ScoredSearchTerm[];
  briefAnchors: Map<string, string>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Term</TableHead>
          <TableHead className="text-right">Clicks</TableHead>
          <TableHead className="text-right">Conv.</TableHead>
          {/* The two columns that carry the argument, and neither existed. */}
          <TableHead className="text-right">Spent</TableHead>
          <TableHead className="text-right">Per conv.</TableHead>
          <TableHead className="text-right">Organic</TableHead>
          <TableHead>Signal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {terms.map((t) => {
          const signal = SIGNAL[t.recommendationType] ?? SIGNAL.monitor!;
          const cpa = costPerConversion(t.cost, t.conversions);
          const anchor = briefAnchors.get(t.term);
          const isOpportunity = t.recommendationType === "paid-proven-organic-needed";
          return (
            <TableRow key={t.term} className={cn(!isOpportunity && "text-muted-foreground")}>
              <TableCell className="font-medium text-foreground">{t.term}</TableCell>
              <TableCell className="text-right tabular-nums">
                {t.clicks.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">{t.conversions}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {usdPrecise(t.cost)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {cpa === null ? "—" : usdPrecise(cpa)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {t.organicPosition === null ? "—" : `#${t.organicPosition}`}
              </TableCell>
              <TableCell>
                {/*
                  Every signal now leads somewhere. "Reduce bid" used to be a dead badge — real
                  advice with no action anywhere on this page; its recommendation lives in the
                  queue, so the row links there.
                */}
                {anchor ? (
                  <a
                    href={`#${briefAnchorId(anchor)}`}
                    className="inline-flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={signal.blurb}
                  >
                    <Badge variant={signal.variant}>
                      {signal.label}
                      <ArrowRight className="h-3 w-3" />
                    </Badge>
                  </a>
                ) : t.recommendationType === "reduce-bid-organic-covers" ? (
                  <Link
                    href="/recommendations"
                    className="inline-flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={signal.blurb}
                  >
                    <Badge variant={signal.variant}>
                      {signal.label}
                      <ArrowRight className="h-3 w-3" />
                    </Badge>
                  </Link>
                ) : (
                  <Badge variant={signal.variant} title={signal.blurb}>
                    {signal.label}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
