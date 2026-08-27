"use client";
import { useState } from "react";
import { Check, Copy, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import type { Recommendation, TopOrganicPage } from "@growthos/types";
import { isCreativeBrief } from "@growthos/logic";
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
import { creativeBriefToText, budgetFraction, META_LIMITS } from "./creativeText";

/**
 * One creative opportunity, with its brief rendered as the Meta ad it becomes.
 *
 * The Content Pipeline's brief is a document for a writer, so it renders as an outline. This one is
 * an *ad*: primary text, headline and CTA are literally the fields of Meta's composer, each with a
 * hard limit that truncates in the feed. So it renders as those fields, under their own names, with
 * their own budgets — and `headline`, which the old card dropped entirely, is a required part of
 * the ad rather than an optional extra.
 */
export function CreativeBriefCard({
  rec,
  brief,
  page,
  workspaceId,
}: {
  rec: Recommendation;
  /** The stored brief for this recommendation, whatever shape it turned out to be. */
  brief: unknown;
  /** The organic page behind it — the evidence that justifies paying to amplify it. */
  page: TopOrganicPage | undefined;
  workspaceId: string | null;
}) {
  const [copied, setCopied] = useState(false);
  // One hook per card. The page used to build a single mutation and share it, so acting on one
  // opportunity disabled the buttons on every card at once.
  const actions = useRecommendationActions(workspaceId);

  // Narrowed, not cast. The old page reached for this with `as unknown as CreativeBrief`, so a row
  // of the other shape would have rendered a card of blank fields with no error anywhere.
  const b = isCreativeBrief(brief) ? brief : null;

  async function copyBrief() {
    if (!b) return;
    try {
      await navigator.clipboard.writeText(
        creativeBriefToText(rec.title, b, page)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access.");
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug">{rec.title}</h3>

          {/*
            Why this keyword is worth paying for, in the two facts that actually bear on it:
            demand, and the fact that the topic already earns attention organically.

            `opportunityScore` is deliberately not here. It is an SEO ranking score — 40% of it is
            keyword difficulty and competitor gap, which say nothing about whether to buy a Meta
            audience, and a further 10% is GEO citation potential, which P4.4b never built. On a
            page about amplifying demand with paid, it measured the wrong thing.
          */}
          {page ? (
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/80">
                {page.volume.toLocaleString()}
              </span>{" "}
              searches/mo
              {" · "}
              {page.currentPosition === null
                ? "not ranking"
                : `ranking #${page.currentPosition} organically`}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">{rec.body}</p>
          )}
        </div>

        {rec.status === "snoozed" && (
          <Badge variant="warning" className="shrink-0">
            Snoozed
          </Badge>
        )}
      </div>

      {b ? (
        <div className="border-t bg-secondary/25 px-5 py-4">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* What to make. */}
            <section className="space-y-2.5">
              <Eyebrow>Concept</Eyebrow>
              <Field label="Angle" value={b.hook} />
              <Field label="Format" value={b.format} />
              <Field label="Audience" value={b.audience} />
            </section>

            {/* What goes in the composer, under Meta's own field names. */}
            <section className="space-y-2.5">
              <Eyebrow>Ad copy</Eyebrow>
              <BudgetedField
                label="Primary text"
                value={b.primaryText}
                budget={META_LIMITS.primaryText}
              />
              <BudgetedField
                label="Headline"
                value={b.headline}
                budget={META_LIMITS.headline}
              />
              <Field label="Call to action" value={b.callToAction} />
            </section>
          </div>
        </div>
      ) : (
        <div className="border-t bg-secondary/25 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            No creative brief attached to this opportunity yet.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t p-4">
        {b && (
          <Button variant="outline" size="sm" className="h-8" onClick={copyBrief}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy for Ads Manager"}
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
            <DropdownMenuContent align="end" className="w-48">
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <p className="text-sm">{value}</p>
    </div>
  );
}

/**
 * An ad field with the character budget Meta actually enforces.
 *
 * Past these counts the ad is truncated in the feed, not merely long — the meter is the one rule
 * governing this text and it was nowhere on screen. The generator now fits within both, so a full
 * bar is a warning that a keyword has pushed the template to its edge, not a routine state.
 */
function BudgetedField({
  label,
  value,
  budget,
}: {
  label: string;
  value: string;
  budget: number;
}) {
  const over = value.length > budget;
  const fraction = budgetFraction(value.length, budget);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] tabular-nums",
            over ? "text-warning" : "text-muted-foreground/70"
          )}
        >
          {value.length}/{budget}
        </span>
      </div>
      <p className="text-sm">{value}</p>
      <div
        className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-border"
        role="img"
        aria-label={`${value.length} of ${budget} characters used`}
      >
        <div
          className={cn("h-full rounded-full", over ? "bg-warning" : "bg-primary/50")}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}
