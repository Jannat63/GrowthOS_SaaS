"use client";
import { Building2 } from "lucide-react";
import type { Workspace } from "@growthos/types";
import { Badge } from "@growthos/ui/components/badge";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";

/**
 * Workspace identity. Read-only, and says so.
 *
 * Lifted out of the page body unchanged in substance — the one thing added is the note that these
 * are not editable here. Three fields that look like a form but cannot be typed into are a small
 * dead end, and saying why costs one line.
 */
export function GeneralSection({ workspace }: { workspace: Workspace | undefined }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold tracking-tight">General</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        How this workspace is identified. Name and URL are set when the workspace is created — ask
        support to change them.
      </p>

      {!workspace ? (
        <Skeleton className="mt-5 h-16 w-full" />
      ) : (
        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Name
            </dt>
            <dd className="mt-1.5 text-sm font-medium">{workspace.name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              URL
            </dt>
            <dd className="mt-1.5 truncate font-mono text-sm">growthos.app/{workspace.slug}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Plan
            </dt>
            <dd className="mt-1.5">
              <Badge variant="muted" className="capitalize">
                {workspace.plan}
              </Badge>
            </dd>
          </div>
        </dl>
      )}
    </Card>
  );
}
