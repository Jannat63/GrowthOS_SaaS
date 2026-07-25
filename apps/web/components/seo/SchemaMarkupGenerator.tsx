"use client";
import { useState } from "react";
import { Code2, Copy, Check } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import type { SchemaMarkupType } from "@growthos/types";
import { useOrganicTraffic } from "@/lib/hooks/useOrganicTraffic";
import { useSchemaMarkup } from "@/lib/hooks/useSchemaMarkup";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";

const TYPE_OPTIONS: Array<{ value: SchemaMarkupType | ""; label: string }> = [
  { value: "", label: "Auto-detect from URL" },
  { value: "WebPage", label: "WebPage" },
  { value: "Article", label: "Article / Blog post" },
  { value: "Product", label: "Product" },
  { value: "CollectionPage", label: "Collection page" },
  { value: "FAQPage", label: "FAQ page" },
  { value: "Organization", label: "Organization (e.g. homepage)" },
];

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors hover:border-ring/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function SchemaMarkupGenerator({ workspaceId }: { workspaceId: string | null }) {
  const { data: traffic } = useOrganicTraffic(workspaceId);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [typeOverride, setTypeOverride] = useState<SchemaMarkupType | "">("");
  const [copied, setCopied] = useState(false);

  const { data: markup, isFetching } = useSchemaMarkup(
    workspaceId,
    selectedPage,
    typeOverride || undefined
  );

  const pages = traffic?.data.pages ?? [];
  const jsonString = markup ? JSON.stringify(markup.data.jsonLd, null, 2) : "";

  async function copyJson() {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Schema markup generator</h2>
        {markup && <DataSourceBadge source={markup.source} />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a page to get a starter JSON-LD snippet — fields we can&apos;t infer are left as{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">[SET_...]</code> placeholders for you to fill in.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Page</label>
          <select
            className={`mt-1 ${selectClass}`}
            value={selectedPage ?? ""}
            onChange={(e) => setSelectedPage(e.target.value || null)}
          >
            <option value="">Select a page…</option>
            {pages.map((p) => (
              <option key={p.pageUrl} value={p.pageUrl}>
                {p.pageUrl}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Schema type</label>
          <select
            className={`mt-1 ${selectClass}`}
            value={typeOverride}
            onChange={(e) => setTypeOverride(e.target.value as SchemaMarkupType | "")}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedPage ? (
        <p className="mt-6 text-sm text-muted-foreground">Select a page above to generate its schema markup.</p>
      ) : isFetching && !markup ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : markup ? (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">Detected: {markup.data.detectedType}</Badge>
            {markup.data.placeholders.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Fill in: {markup.data.placeholders.join(", ")}
              </span>
            )}
          </div>
          <div className="relative">
            <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed">
              {jsonString}
            </pre>
            <button
              onClick={copyJson}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste this inside a <code className="rounded bg-muted px-1 py-0.5">&lt;script type=&quot;application/ld+json&quot;&gt;</code> tag
            in the page&apos;s <code className="rounded bg-muted px-1 py-0.5">&lt;head&gt;</code>.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
