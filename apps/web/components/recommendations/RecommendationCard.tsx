"use client";
import { useState } from "react";
import { Check, Clock, MessageSquare, UserCircle2, X, Send } from "lucide-react";
import type { Recommendation, WorkspaceMember } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
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
import { cn } from "@/lib/utils/cn";
import { useRecommendationActions } from "@/lib/hooks/useRecommendationActions";
import {
  useRecommendationComments,
  useCollaborationActions,
} from "@/lib/hooks/useCollaboration";

const STATUS_BADGE: Record<
  Recommendation["status"],
  { label: string; variant: "default" | "success" | "muted" | "outline" }
> = {
  pending: { label: "Pending", variant: "default" },
  acted: { label: "Acted", variant: "success" },
  snoozed: { label: "Snoozed", variant: "muted" },
  dismissed: { label: "Dismissed", variant: "outline" },
};

export function RecommendationCard({
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
  const status = STATUS_BADGE[rec.status];

  function submitComment() {
    const body = draft.trim();
    if (!body) return;
    addComment.mutate({ recId: rec.id, body }, { onSuccess: () => setDraft("") });
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{rec.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{rec.body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant="muted">Impact {rec.impactScore}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Assignee picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
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
          className={cn(threadOpen && "text-primary")}
        >
          <MessageSquare className="h-4 w-4" />
          Comments
          {comments && comments.data.length > 0 && (
            <span className="ml-1 rounded-full bg-secondary px-1.5 text-xs tabular-nums">
              {comments.data.length}
            </span>
          )}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => actions.mutate({ id: rec.id, status: "acted" })}
            disabled={actions.isPending || rec.status === "acted"}
          >
            <Check className="h-4 w-4" /> Act
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => actions.mutate({ id: rec.id, status: "snoozed" })}
            disabled={actions.isPending}
          >
            <Clock className="h-4 w-4" /> Snooze
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => actions.mutate({ id: rec.id, status: "dismissed" })}
            disabled={actions.isPending}
          >
            <X className="h-4 w-4" /> Dismiss
          </Button>
        </div>
      </div>

      {/* Comment thread — lazily loaded when opened */}
      {threadOpen && (
        <div className="mt-4 space-y-3 rounded-lg border bg-secondary/30 p-4">
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
                    <span className="text-xs text-muted-foreground">
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
    </Card>
  );
}
