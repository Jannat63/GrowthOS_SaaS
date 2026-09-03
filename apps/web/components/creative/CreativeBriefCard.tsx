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
 * One creative opportunity, rendered as the Meta ad it becomes.
 *
 * The brief used to render as labelled form fields — PRIMARY TEXT, HEADLINE, CALL TO ACTION in a
 * two-column grid — which described the ad without ever showing it. The character budgets were
 * meters: an abstraction of a rule whose whole point is concrete, because past 125 characters Meta
 * folds the copy behind "See more" and the end is never read.
 *
 * So the deliverable renders as the post. The cut line is drawn where Meta actually cuts, and the
 * overflow stays visible past it struck through, which is what "over budget" means in the feed.
 * The composer fields sit beside it for the buyer who is filling the form rather than judging the
 * ad — both audiences, one card, neither guessing.
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
      await navigator.clipboard.writeText(creativeBriefToText(rec.title, b, page));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access.");
    }
  }

  return (
    <Card
      className={cn(
        "overflow-hidden p-0 transition-colors",
        // Border shift, not a background flood — same reasoning as the Content Pipeline's card:
        // these are spaced apart with their own action bar, so there is no pointer ambiguity to
        // resolve, and repainting a block this size would be heavier than the feedback is worth.
        "hover:border-foreground/20",
        // Acting is the page's purpose, so a row on its way out should visibly change.
        rec.status === "snoozed" && "opacity-75"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug">{rec.title}</h3>

          {/*
            Why this keyword is worth paying for, in the two facts that bear on it: demand, and the
            fact that the topic already earns attention organically.

            `opportunityScore` is deliberately not here. It is an SEO ranking score — 40% of it is
            keyword difficulty and competitor gap, which say nothing about whether to buy a Meta
            audience, and a further 10% is GEO citation potential, which P4.4b never built.
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

          {/* Why this brief opens the way it does. Absent on rows stored before plays existed. */}
          {b?.rationale && (
            <p className="mt-2 max-w-prose text-xs leading-relaxed text-muted-foreground">
              {b.rationale}
            </p>
          )}
        </div>

        {rec.status === "snoozed" && (
          <Badge variant="warning" className="shrink-0">
            Snoozed
          </Badge>
        )}
      </div>

      {b ? (
        <div className="border-t bg-background/40 px-5 py-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <AdPreview
              primaryText={b.primaryText}
              headline={b.headline}
              callToAction={b.callToAction}
              format={b.format}
            />

            {/* The composer's own fields, for filling the form rather than judging the ad. */}
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:content-start">
              <Field label="Angle" value={b.hook} />
              <Field label="Audience" value={b.audience} />
              <Field label="Format" value={b.format} />
              <Field label="Call to action" value={b.callToAction} />
              <div className="sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-x-6">
                <Budget label="Primary text" value={b.primaryText} budget={META_LIMITS.primaryText} />
                <Budget label="Headline" value={b.headline} budget={META_LIMITS.headline} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t bg-background/40 px-5 py-4">
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

/**
 * The ad as a post.
 *
 * Not interactive: nothing here is a control in this product, so the CTA is a styled span rather
 * than a button and the whole block is inert.
 *
 * Entirely neutral, deliberately. The preview earns its separation from the card by *value* — it
 * sits on `--card` against a darker body — not by colour. An earlier pass tinted this chrome with
 * `--channel-meta`, which put a second saturated hue beside the ember brand to solve what was
 * actually a contrast problem. The avatar stands in for the customer's own page anyway, so if it
 * implied any brand it would be theirs, not Meta's.
 */
function AdPreview({
  primaryText,
  headline,
  callToAction,
  format,
}: {
  primaryText: string;
  headline: string;
  callToAction: string;
  format: string;
}) {
  return (
    <figure className="m-0 overflow-hidden rounded-xl border bg-card shadow-sm">
      <figcaption className="sr-only">
        Preview of the ad as it appears in the Meta feed
      </figcaption>

      <div className="flex items-center gap-2 px-3 pt-3">
        <span
          aria-hidden
          className="h-6 w-6 shrink-0 rounded-full bg-muted-foreground/25 ring-1 ring-border"
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11px] font-semibold">Your Page</p>
          <p className="text-[10px] text-muted-foreground">Sponsored</p>
        </div>
      </div>

      <FeedCopy value={primaryText} />

      {/*
        Stands in for the asset, and names the format the brief asks for. Deliberately a shallow
        band rather than a feed-accurate 4:3 — a placeholder that big is mostly empty space, and it
        pushed the copy and the headline (the parts under review) down the card.
      */}
      <div className="flex aspect-[16/9] items-center justify-center border-y bg-secondary/60 px-4">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {format}
        </p>
      </div>

      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        {/* Wraps rather than truncates: the headline is the field being budgeted, so hiding its
            end is the one thing this preview must not do. Meta gives it two lines. */}
        <p className="min-w-0 flex-1 text-[11px] font-semibold uppercase leading-snug tracking-wide">
          {headline}
        </p>
        <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-secondary-foreground">
          {callToAction}
        </span>
      </div>
    </figure>
  );
}

/**
 * Primary text with the fold drawn where Meta puts it.
 *
 * Everything past `META_LIMITS.primaryText` collapses behind "See more" in the feed, so it renders
 * struck through and dimmed below the fold line rather than being hidden — the buyer needs to see
 * the words they are about to lose, not just a number saying they lost some.
 */
function FeedCopy({ value }: { value: string }) {
  const limit = META_LIMITS.primaryText;
  const over = value.length > limit;
  const shown = over ? value.slice(0, limit) : value;
  const cut = over ? value.slice(limit) : "";

  return (
    <div className="px-3 py-2.5">
      <p className="text-[11px] leading-relaxed">
        {shown}
        {over && (
          <>
            <span className="text-muted-foreground/50 line-through">{cut}</span>{" "}
            <span className="font-medium text-muted-foreground">… See more</span>
          </>
        )}
      </p>
      {over && (
        <p className="mt-1.5 font-mono text-[10px] text-warning">
          {value.length - limit} characters past the fold
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-0.5 text-sm leading-snug">{value}</p>
    </div>
  );
}

/**
 * A character budget Meta actually enforces.
 *
 * The fill was `bg-primary/50`. `--primary` is the action colour *and* the token BrandingProvider
 * overwrites per workspace for white-labelling, so a measurement was being painted in a tenant's
 * brand colour — the exact hazard `CLAUDE.md` warns about. It is a fact about a Meta ad, so it
 * takes the Meta channel colour, and `--warning` when the copy runs past the fold.
 */
function Budget({ label, value, budget }: { label: string; value: string; budget: number }) {
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
      <div
        className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border"
        role="img"
        aria-label={`${label}: ${value.length} of ${budget} characters used`}
      >
        <div
          className={cn("h-full rounded-full", over ? "bg-warning" : "bg-muted-foreground")}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}
