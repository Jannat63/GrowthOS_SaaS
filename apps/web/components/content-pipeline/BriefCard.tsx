"use client";
import { useState } from "react";
import { Check, ChevronRight, Copy, ExternalLink, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import type { ContentBriefRecord, Recommendation, ScoredSearchTerm } from "@growthos/types";
import { isContentBrief } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@growthos/ui/components/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import {
  useRecommendationActions,
  toastUndoableDismiss,
  snoozeUntil,
} from "@/lib/hooks/useRecommendationActions";
import { useContentBriefActions } from "@/lib/hooks/useContentBriefs";
import {
  briefAnchorId,
  briefToMarkdown,
  costPerConversion,
  usdPrecise,
  META_TITLE_BUDGET,
  META_DESCRIPTION_BUDGET,
} from "./briefText";
import { STAGES, nextStage, stageIndex } from "./stages";

/**
 * One content opportunity, with its brief rendered as the document it is.
 *
 * The card previously showed the brief as four derived numbers — "~1500 words · 4 sections ·
 * Article" — printing `headingStructure.length` where the outline itself belonged. Six of the
 * brief's nine fields (the outline, the FAQ, both meta fields, the term list, the link targets)
 * were generated, persisted and returned by the API without ever reaching a screen.
 */
export function BriefCard({
  rec,
  brief,
  term,
  workspaceId,
}: {
  rec: Recommendation;
  brief: ContentBriefRecord | undefined;
  /** The search term row behind this opportunity — where the money argument comes from. */
  term: ScoredSearchTerm | undefined;
  workspaceId: string | null;
}) {
  const [copied, setCopied] = useState(false);
  // Per card, not per page. The old page built one mutation at the top and shared it across every
  // card, so acting on one opportunity disabled the buttons on all of them at once.
  const actions = useRecommendationActions(workspaceId);
  const briefActions = useContentBriefActions(workspaceId);

  // `content_briefs.brief` holds either shape; this page renders the content one. Narrowed rather
  // than assumed, so an organic->paid row landing here shows the empty state instead of a card of
  // undefined fields.
  const b = isContentBrief(brief?.brief) ? brief.brief : null;
  const stage = brief?.status ?? "draft";
  const advance = brief ? nextStage(stage) : null;
  const cpa = term ? costPerConversion(term.cost, term.conversions) : null;

  async function copyBrief() {
    if (!b || !brief) return;
    try {
      await navigator.clipboard.writeText(briefToMarkdown(brief.keyword, b));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused in insecure contexts and by some browser settings. Say what
      // happened rather than leaving the button looking broken.
      toast.error("Couldn't copy — your browser blocked clipboard access.");
    }
  }

  // A spaced card, not a row in a dense list, so it takes a border shift rather than a background
  // flood — the pointer is never ambiguous between two of these, and repainting a block this size
  // on hover is heavier than the feedback is worth.
  return (
    <Card
      id={briefAnchorId(rec.id)}
      className="scroll-mt-24 overflow-hidden p-0 transition-colors hover:border-foreground/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug">{rec.title}</h3>

          {/*
            The argument for writing the article, in the numbers that make it. `cost` and `clicks`
            are on every search term and neither reached the screen — so the page asked for work
            without ever showing what the alternative was costing.
          */}
          {term ? (
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/80">{usdPrecise(term.cost)}</span> spent
              {" · "}
              {term.conversions} conversions
              {cpa !== null && <> · {usdPrecise(cpa)} each</>}
              {" · "}
              {term.organicPosition === null
                ? "no organic ranking"
                : `organic #${term.organicPosition}`}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">{rec.body}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {brief && <StageChip stage={stage} />}
          {rec.status === "snoozed" && <Badge variant="warning">Snoozed</Badge>}
        </div>
      </div>

      {b && brief ? (
        <div className="border-t bg-secondary/25 px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Content brief
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Target {b.wordCount.toLocaleString()} words · {b.schemaType}
            </span>
          </div>

          <p className="mt-2 text-base font-semibold leading-snug">{b.recommendedH1}</p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <section>
              <SubHeading>Outline</SubHeading>
              {/* Numbered because a document's sections are genuinely ordered — this is the
                  sequence the writer works through, not a decorative marker. */}
              <ol className="mt-1.5 space-y-1">
                {b.headingStructure.map((h, i) => (
                  <li key={h} className="flex gap-2 text-sm">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <SubHeading>Questions to answer</SubHeading>
              <ul className="mt-1.5 space-y-1">
                {b.faqQuestions.map((q) => (
                  <li key={q} className="text-sm text-muted-foreground">
                    {q}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-4 space-y-2 border-t pt-3">
            <MetaLine label="Meta title" value={b.metaTitle} budget={META_TITLE_BUDGET} />
            <MetaLine
              label="Meta description"
              value={b.metaDescription}
              budget={META_DESCRIPTION_BUDGET}
            />
          </div>

          {b.entities.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <SubHeading>Terms to work in</SubHeading>
              {b.entities.map((e) => (
                <span
                  key={e}
                  className="rounded-full border px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {e}
                </span>
              ))}
            </div>
          )}

          {brief.publishedUrl && (
            <a
              href={brief.publishedUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {brief.publishedUrl}
            </a>
          )}
        </div>
      ) : (
        <div className="border-t bg-secondary/25 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            No brief attached to this opportunity yet.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t p-4">
        {advance && brief && (
          <Button
            size="sm"
            className="h-8"
            onClick={() =>
              briefActions.mutate({ briefId: brief.id, status: advance.key })
            }
          >
            {advance.advance}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {b && (
          <Button variant="outline" size="sm" className="h-8" onClick={copyBrief}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy brief"}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground"
            onClick={() => actions.mutate({ id: rec.id, status: "acted" })}
          >
            <Check className="h-4 w-4" />
            Mark done
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground"
                aria-label={`More actions for "${rec.title}"`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {brief && (
                <>
                  <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
                  {STAGES.map((s) => (
                    <DropdownMenuItem
                      key={s.key}
                      disabled={s.key === stage}
                      onClick={() => briefActions.mutate({ briefId: brief.id, status: s.key })}
                    >
                      <span className="flex-1">{s.label}</span>
                      {s.key === stage && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel>Snooze until</DropdownMenuLabel>
              {[
                { label: "Tomorrow", days: 1 },
                { label: "Next week", days: 7 },
              ].map((o) => (
                <DropdownMenuItem
                  key={o.days}
                  onClick={() =>
                    actions.mutate({
                      id: rec.id,
                      status: "snoozed",
                      snoozedUntil: snoozeUntil(o.days),
                    })
                  }
                >
                  {o.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  actions.mutate({ id: rec.id, status: "dismissed" });
                  toastUndoableDismiss(rec.title, () =>
                    actions.mutate({ id: rec.id, status: "pending" })
                  );
                }}
              >
                <X className="h-4 w-4" />
                Dismiss
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </span>
  );
}

/**
 * A meta field with the length budget it is written against.
 *
 * Character count is the constraint that actually governs these two strings — past it, the search
 * result truncates. Showing the value without the count leaves the writer to guess at the only
 * rule that applies to it.
 */
function MetaLine({
  label,
  value,
  budget,
}: {
  label: string;
  value: string;
  budget: number;
}) {
  const over = value.length > budget;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <SubHeading>{label}</SubHeading>
      <span className="min-w-0 flex-1 text-sm text-muted-foreground">{value}</span>
      <span
        className={cn(
          "font-mono text-[10px] tabular-nums",
          over ? "text-warning" : "text-muted-foreground/70"
        )}
        title={over ? `${value.length - budget} over the ${budget}-character budget` : undefined}
      >
        {value.length}/{budget}
      </span>
    </div>
  );
}

/** Where this brief sits in the pipeline, as position rather than just a word. */
function StageChip({ stage }: { stage: ContentBriefRecord["status"] }) {
  const i = stageIndex(stage);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="flex items-center gap-0.5">
        {STAGES.map((s, n) => (
          <span
            key={s.key}
            className={cn(
              "h-1 w-3 rounded-full",
              n <= i ? "bg-primary" : "bg-border"
            )}
          />
        ))}
      </span>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em]">
        {STAGES[i]!.label}
      </span>
    </span>
  );
}
