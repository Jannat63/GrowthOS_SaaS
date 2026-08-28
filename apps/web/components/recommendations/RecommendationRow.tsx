"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock,
  MessageSquare,
  MoreHorizontal,
  Send,
  UserCircle2,
  X,
} from "lucide-react";
import type { Recommendation, WorkspaceMember } from "@growthos/types";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Textarea } from "@growthos/ui/components/textarea";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@growthos/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@growthos/ui/components/tooltip";
import { cn } from "@/lib/utils/cn";
import {
  useRecommendationActions,
  toastUndoableDismiss,
  snoozeUntil,
} from "@/lib/hooks/useRecommendationActions";
import {
  useRecommendationComments,
  useCollaborationActions,
} from "@/lib/hooks/useCollaboration";
import { Bridge } from "./Bridge";
import { effortLabel, formatAge, shortDate } from "./priority";

/**
 * Where a recommendation is actually worked.
 *
 * Each type has a module that does the job — the content brief it generated, the creative queue,
 * the fatigue monitor. The queue is the triage surface, not the work surface, and until now it was
 * a dead end: it could mark something done but could not take you to the thing that does it. Same
 * map as the Intelligence report's opportunity cards, so a recommendation leads to the same place
 * from both screens.
 */
const TYPE_HREF: Record<string, string> = {
  paid_to_organic: "/content-pipeline",
  organic_to_paid: "/creative-queue",
  fatigue_alert: "/fatigue-monitor",
};

const SNOOZE_OPTIONS = [
  { label: "Tomorrow", days: 1 },
  { label: "Next week", days: 7 },
  { label: "In a month", days: 30 },
] as const;

export function RecommendationRow({
  rec,
  workspaceId,
  members,
}: {
  rec: Recommendation;
  workspaceId: string | null;
  members: WorkspaceMember[];
}) {
  const [threadOpen, setThreadOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const actions = useRecommendationActions(workspaceId);
  const { addComment, assign } = useCollaborationActions(workspaceId);
  const { data: comments } = useRecommendationComments(workspaceId, rec.id, threadOpen);

  const assignee = members.find((m) => m.userId === rec.assignedTo) ?? null;
  const href = TYPE_HREF[rec.type];
  const age = formatAge(rec.createdAt);
  // The thread is still fetched lazily, but once it is open its length is the live figure — the
  // row's stored count is a snapshot from the last list load and would not include a comment just
  // posted.
  const commentCount = comments?.data.length ?? rec.commentCount;

  function submitComment() {
    const body = draft.trim();
    if (!body) return;
    addComment.mutate({ recId: rec.id, body }, { onSuccess: () => setDraft("") });
  }

  function dismiss() {
    actions.mutate({ id: rec.id, status: "dismissed" });
    toastUndoableDismiss(rec.title, () =>
      actions.mutate({ id: rec.id, status: "pending" })
    );
  }

  return (
    <li
      className={cn(
        "group relative px-5 py-4 transition-colors",
        // A row on its way out of the queue reads as settled rather than active. Acting is the
        // page's whole purpose, so finishing something should visibly change it.
        rec.status === "acted" && "bg-success/[0.04]",
        rec.status !== "pending" && rec.status !== "acted" && "opacity-70",
        /*
          Hover. The queue is a list of rows carrying per-row controls, and nothing responded to
          the pointer — so which row an action belonged to was only knowable by aiming carefully.
          `focus-within` gives keyboard users the same anchor, which the pointer-only version left
          out. Both sit above the status tints above, so an acted row still reads as acted.
        */
        "hover:bg-secondary/40 focus-within:bg-secondary/40"
      )}
    >
      {/* Scan line: the same four facts in the same order on every row, so the eye can run down
          the column instead of re-reading each card. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <Bridge from={rec.sourceChannel} to={rec.targetChannel} />

        <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
          {effortLabel(rec.effortScore)}
        </span>

        {commentCount > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageSquare className="h-3 w-3" />
            {commentCount}
          </span>
        )}

        {assignee && (
          <span className="inline-flex items-center gap-1">
            <UserCircle2 className="h-3 w-3" />
            {assignee.name}
          </span>
        )}

        {rec.dueDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            Due {shortDate(rec.dueDate)}
          </span>
        )}

        {rec.status === "snoozed" && (
          <Badge variant="warning">
            {rec.snoozedUntil ? `Back ${shortDate(rec.snoozedUntil)}` : "Snoozed"}
          </Badge>
        )}
        {rec.status === "acted" && <Badge variant="success">Done</Badge>}
        {rec.status === "dismissed" && <Badge variant="outline">Dismissed</Badge>}

        <span className="ml-auto flex items-center gap-3">
          {age && <span className="hidden sm:inline">{age}</span>}
          {/*
            Priority is the number the queue is actually ordered by. It was never shown — the card
            printed `impactScore` instead, which is a different field, so the visible column
            contradicted the sort order it was sitting in.
          */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help font-mono text-xs font-semibold tabular-nums text-foreground/70">
                {rec.compositeScore}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[15rem]">
              Priority {rec.compositeScore} of 100 — impact {rec.impactScore}, urgency{" "}
              {rec.urgencyScore}, effort {rec.effortScore}. This is the figure the queue is
              ordered by.
            </TooltipContent>
          </Tooltip>
        </span>
      </div>

      <p className="mt-2 text-sm font-medium leading-snug">{rec.title}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{rec.body}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
              <UserCircle2 className="h-4 w-4" />
              {assignee ? assignee.name : "Assign"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Assign to</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {members.map((m) => (
              <DropdownMenuItem
                key={m.userId}
                onClick={() => assign.mutate({ recId: rec.id, assignedTo: m.userId })}
              >
                <span className="flex-1 truncate">{m.name}</span>
                {m.userId === rec.assignedTo && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
            {rec.assignedTo && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="font-normal text-muted-foreground">
                  Due date
                </DropdownMenuLabel>
                {[
                  { label: "In 3 days", days: 3 },
                  { label: "Next week", days: 7 },
                ].map((d) => (
                  <DropdownMenuItem
                    key={d.days}
                    onClick={() =>
                      assign.mutate({
                        recId: rec.id,
                        assignedTo: rec.assignedTo,
                        dueDate: snoozeUntil(d.days),
                      })
                    }
                  >
                    {d.label}
                  </DropdownMenuItem>
                ))}
                {rec.dueDate && (
                  <DropdownMenuItem
                    onClick={() =>
                      assign.mutate({
                        recId: rec.id,
                        assignedTo: rec.assignedTo,
                        dueDate: null,
                      })
                    }
                  >
                    Clear due date
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => assign.mutate({ recId: rec.id, assignedTo: null })}
                >
                  Unassign
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setThreadOpen((v) => !v)}
          className={cn("h-8 px-2 text-muted-foreground", threadOpen && "text-primary")}
          aria-expanded={threadOpen}
        >
          <MessageSquare className="h-4 w-4" />
          {commentCount > 0 ? `Comments (${commentCount})` : "Comment"}
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          {/*
            The row's own action verb. `actionLabel` — "Generate brief", "Generate creative",
            "Refresh creative" — has been stored per recommendation since M2 and was dropped on the
            floor, so every row offered the same anonymous "Act". Cross-channel rows genuinely have
            no specific verb and fall back to naming what the button does to the queue.
          */}
          {href ? (
            <Button size="sm" asChild className="h-8">
              <Link href={href}>
                {rec.actionLabel ?? "Open"}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}

          <Button
            size="sm"
            variant={href ? "outline" : "default"}
            className="h-8"
            onClick={() => actions.mutate({ id: rec.id, status: "acted" })}
            disabled={rec.status === "acted"}
          >
            <Check className="h-4 w-4" />
            {rec.status === "acted" ? "Done" : "Mark done"}
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
              {SNOOZE_OPTIONS.map((o) => (
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
                  <Clock className="h-4 w-4" />
                  {o.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={dismiss}>
                <X className="h-4 w-4" />
                Dismiss
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {threadOpen && (
        <div className="mt-3 space-y-3 rounded-lg border bg-secondary/30 p-4">
          {!comments ? (
            <Skeleton className="h-12 w-full" />
          ) : comments.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No comments yet — start the discussion.
            </p>
          ) : (
            <ul className="space-y-3">
              {comments.data.map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{c.authorName ?? "Someone"}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{c.body}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              className="min-h-[44px] bg-background"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitComment();
              }}
            />
            <Button
              size="icon"
              onClick={submitComment}
              disabled={addComment.isPending || !draft.trim()}
              aria-label="Post comment"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
