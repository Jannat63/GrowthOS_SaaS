"use client";
import { useState } from "react";
import { Search, RefreshCw, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useSiteAudit, useTriggerSiteAudit } from "@/lib/hooks/useSiteAudit";

export function SiteAuditPanel({ workspaceId }: { workspaceId: string | null }) {
  const { data: audit, isLoading } = useSiteAudit(workspaceId);
  const trigger = useTriggerSiteAudit(workspaceId);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [urlOverride, setUrlOverride] = useState("");

  const running = audit?.status === "queued" || audit?.status === "processing";
  const result = audit?.status === "complete" ? audit.result : undefined;

  function runAudit() {
    trigger.mutate(urlOverride.trim() ? { url: urlOverride.trim() } : {});
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold tracking-tight">Site audit</h2>
        </div>
        <Badge variant="muted">Real crawl — no third-party data</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Crawls your actual site over HTTP and checks each page for the basics: titles, meta
        descriptions, headings, thin content, and canonical tags.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="url"
          value={urlOverride}
          onChange={(e) => setUrlOverride(e.target.value)}
          placeholder="https://yoursite.com (defaults to your workspace's site)"
          disabled={running}
          className="h-9 min-w-64 flex-1 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={runAudit}
          disabled={running || trigger.isPending}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", running && "animate-spin")} />
          {running ? "Crawling…" : audit ? "Run again" : "Run audit"}
        </button>
      </div>
      {trigger.isError && (
        <p className="mt-2 text-xs text-destructive">
          {trigger.error instanceof Error ? trigger.error.message : "Couldn't start the audit."}
        </p>
      )}

      {isLoading ? (
        <Skeleton className="mt-6 h-40 w-full" />
      ) : !audit ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No audit has been run yet — enter a URL above (or leave it blank to use your workspace's
          site) and run one.
        </p>
      ) : running ? (
        <div className="mt-6 space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.max(audit.progress, 5)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Crawling your site now — this can take a minute for larger sites.</p>
        </div>
      ) : audit.status === "failed" ? (
        <p className="mt-6 text-sm text-destructive">
          The last audit failed: {audit.error ?? "unknown error"}. Check the URL and try again.
        </p>
      ) : result ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="font-display text-2xl font-semibold tabular-nums">{result.pagesCrawled}</p>
              <p className="text-xs text-muted-foreground">Pages crawled</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-display text-2xl font-semibold tabular-nums text-success">{result.healthyPages}</p>
              <p className="text-xs text-muted-foreground">Healthy pages</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className={cn("font-display text-2xl font-semibold tabular-nums", result.totalIssues > 0 && "text-warning")}>
                {result.totalIssues}
              </p>
              <p className="text-xs text-muted-foreground">Issues found</p>
            </div>
          </div>

          <ul className="divide-y rounded-lg border">
            {result.pages.map((page) => {
              const isOpen = expanded === page.url;
              return (
                <li key={page.url}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : page.url)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{page.url}</span>
                    {page.issues.length === 0 ? (
                      <Badge variant="muted">Healthy</Badge>
                    ) : (
                      <Badge variant="warning">{page.issues.length} issue{page.issues.length > 1 ? "s" : ""}</Badge>
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t bg-secondary/20 px-4 py-3 pl-10">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Open page <ExternalLink className="h-3 w-3" />
                      </a>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                        <div><dt className="inline font-medium text-foreground">Status: </dt><dd className="inline">{page.statusCode ?? "—"}</dd></div>
                        <div><dt className="inline font-medium text-foreground">Words: </dt><dd className="inline">{page.wordCount}</dd></div>
                        <div><dt className="inline font-medium text-foreground">H1s: </dt><dd className="inline">{page.h1Count}</dd></div>
                        <div><dt className="inline font-medium text-foreground">Canonical: </dt><dd className="inline">{page.hasCanonical ? "Yes" : "No"}</dd></div>
                      </dl>
                      {page.title && <p className="mt-2 text-xs text-muted-foreground">Title: "{page.title}"</p>}
                      {page.issues.length > 0 && (
                        <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-warning">
                          {page.issues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
