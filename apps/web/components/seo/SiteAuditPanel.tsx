"use client";
import { useMemo, useState } from "react";
import { Search, RefreshCw, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
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

  // Worst first. The crawler returns pages in the order it found them, which puts the homepage at
  // the top and buries the thin, title-less pages that are the entire reason to run an audit.
  const pages = useMemo(
    () => [...(result?.pages ?? [])].sort((a, b) => b.issues.length - a.issues.length),
    [result]
  );

  function runAudit() {
    trigger.mutate(urlOverride.trim() ? { url: urlOverride.trim() } : {});
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Site audit</h2>
      </div>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Crawls your site over HTTP and checks each page for the basics: titles, meta descriptions,
        headings, thin content, and canonical tags. Your pages are fetched directly, so the results
        are about your site as it is right now, not a third party&rsquo;s copy of it.
      </p>

      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!running && !trigger.isPending) runAudit();
        }}
      >
        <Input
          type="url"
          value={urlOverride}
          onChange={(e) => setUrlOverride(e.target.value)}
          placeholder="https://yoursite.com"
          aria-label="Website URL to audit"
          disabled={running}
          className="min-w-64 flex-1"
        />
        <Button type="submit" disabled={running || trigger.isPending}>
          <RefreshCw className={cn("h-3.5 w-3.5", running && "animate-spin")} aria-hidden="true" />
          {running ? "Crawling…" : audit ? "Run again" : "Run audit"}
        </Button>
      </form>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Leave the box empty to crawl the site on your workspace.
      </p>

      {trigger.isError && (
        <p className="mt-2 text-sm text-destructive">
          {trigger.error instanceof Error ? trigger.error.message : "Couldn't start the audit."}
        </p>
      )}

      {isLoading ? (
        <Skeleton className="mt-6 h-40 w-full" />
      ) : !audit ? (
        <p className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No audit yet. Run one to see how your pages are set up.
        </p>
      ) : running ? (
        <div className="mt-6 space-y-2">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={audit.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Crawl progress"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.max(audit.progress, 5)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Crawling now — a larger site can take a minute.
          </p>
        </div>
      ) : audit.status === "failed" ? (
        <p className="mt-6 text-sm text-destructive">
          The last audit failed: {audit.error ?? "no reason given"}. Check the URL is reachable and
          run it again.
        </p>
      ) : result ? (
        <div className="mt-6 space-y-4">
          {/*
            One headline, stated as a sentence rather than three number tiles.

            Pages crawled, healthy pages and issues found were three equal-weight tiles, but they
            are not three facts — healthy and unhealthy sum to crawled, so the row asked the reader
            to do arithmetic to learn the one thing that matters: is there anything to fix.
          */}
          <div className="rounded-lg border p-4">
            {result.totalIssues === 0 ? (
              <p className="text-sm">
                <span className="font-medium text-success">Nothing to fix.</span>{" "}
                <span className="text-muted-foreground">
                  All {result.pagesCrawled} {result.pagesCrawled === 1 ? "page" : "pages"} passed
                  every check.
                </span>
              </p>
            ) : (
              <p className="text-sm">
                <span className="font-display text-2xl font-semibold tabular-nums text-warning">
                  {result.totalIssues}
                </span>{" "}
                <span className="text-muted-foreground">
                  {result.totalIssues === 1 ? "issue" : "issues"} across{" "}
                  {result.pagesCrawled - result.healthyPages} of {result.pagesCrawled} crawled{" "}
                  {result.pagesCrawled === 1 ? "page" : "pages"}.
                </span>
              </p>
            )}
          </div>

          <ul className="divide-y rounded-lg border">
            {pages.map((page) => {
              const isOpen = expanded === page.url;
              const panelId = `audit-${encodeURIComponent(page.url)}`;
              return (
                <li key={page.url}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : page.url)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    {isOpen ? (
                      <ChevronDown
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{page.url}</span>
                    {page.issues.length === 0 ? (
                      <Badge variant="muted">Clean</Badge>
                    ) : (
                      <Badge variant="warning">
                        {page.issues.length} {page.issues.length === 1 ? "issue" : "issues"}
                      </Badge>
                    )}
                  </button>

                  {isOpen && (
                    <div id={panelId} className="border-t bg-secondary/20 px-4 py-3 pl-10">
                      {page.issues.length > 0 && (
                        <ul className="space-y-1 text-sm text-warning">
                          {page.issues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      )}

                      <dl
                        className={cn(
                          "grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4",
                          page.issues.length > 0 && "mt-3 border-t pt-3"
                        )}
                      >
                        <Fact label="Status">{page.statusCode ?? "—"}</Fact>
                        <Fact label="Words">{page.wordCount}</Fact>
                        <Fact label="H1s">{page.h1Count}</Fact>
                        <Fact label="Canonical">{page.hasCanonical ? "Yes" : "No"}</Fact>
                      </dl>

                      {page.title && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Title: &ldquo;{page.title}&rdquo;
                        </p>
                      )}

                      <a
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Open page
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
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

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{children}</dd>
    </div>
  );
}
