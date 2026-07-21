"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Loader2, Search } from "lucide-react";
import { api } from "@/lib/api/client";

const tabs = [
  { label: "Overview", href: "/seo" },
  { label: "Keyword Explorer", href: "/seo/keyword-explorer" },
  { label: "Rank Tracker", href: "/seo/rank-tracker" },
  { label: "Site Audit", href: "/seo/site-audit" },
  { label: "Content Studio", href: "/seo/content-studio" },
  { label: "Technical SEO", href: "/seo/technical-seo" },
  { label: "Backlinks", href: "/seo/backlinks" },
  { label: "AI Citations", href: "/seo/ai-citations" },
];

interface CrawledPage {
  url: string;
  statusCode: number | null;
  title: string | null;
  wordCount: number;
  h1Count: number;
  hasCanonical: boolean;
  issues: string[];
}

export default function SiteAuditPage() {
  const [url, setUrl] = useState("https://github.com/about");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CrawledPage[] | null>(null);

  async function runAudit() {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await api.post<{ pagesAudited: number; pages: CrawledPage[] }>("/api/seo/audit/crawl", {
        startUrl: url,
        maxPages: 8,
      });
      setResults(res.pages);
    } catch (e) {
      setError("Couldn't crawl that URL — is the backend running, and is the URL reachable?");
    } finally {
      setLoading(false);
    }
  }

  const totalIssues = results?.reduce((sum, p) => sum + p.issues.length, 0) ?? 0;

  return (
    <div>
      <TopBar subtitle="Real site crawl — fetches live pages and inspects them for real SEO issues." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <Card>
          <div className="text-heading-2 mb-3">Run a Real Site Audit</div>
          <p className="text-body text-neutral mb-4">
            This actually crawls the URL you enter — no mock data. It fetches up to 8 pages, following internal links, and checks for broken links, missing meta tags, thin content, and more.
          </p>
          <div className="flex gap-3">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" leftIcon={<Search className="h-4 w-4" />} className="flex-1" />
            <Button onClick={runAudit} loading={loading}>Run Audit</Button>
          </div>
        </Card>

        {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

        {loading && (
          <div className="flex items-center justify-center py-16 text-neutral">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Crawling live pages...
          </div>
        )}

        {results && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Card className="text-center py-6">
                <div className="text-display-2">{results.length}</div>
                <div className="text-small text-neutral">Pages Crawled</div>
              </Card>
              <Card className="text-center py-6">
                <div className="text-display-2 text-danger">{totalIssues}</div>
                <div className="text-small text-neutral">Issues Found</div>
              </Card>
              <Card className="text-center py-6">
                <div className="text-display-2 text-success">{results.filter((p) => p.issues.length === 0).length}</div>
                <div className="text-small text-neutral">Clean Pages</div>
              </Card>
            </div>

            <Card>
              <div className="text-heading-2 mb-4">Page-by-Page Results</div>
              <div className="space-y-3">
                {results.map((p) => (
                  <div key={p.url} className="border border-slate-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-body font-medium truncate max-w-md">{p.url}</span>
                      <Badge tone={p.statusCode && p.statusCode < 400 ? "success" : "danger"}>{p.statusCode ?? "Failed"}</Badge>
                    </div>
                    <div className="text-caption text-neutral mb-2">{p.title || "No title"} · {p.wordCount} words</div>
                    {p.issues.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.issues.map((issue, i) => <Badge key={i} tone="warning">{issue}</Badge>)}
                      </div>
                    ) : (
                      <Badge tone="success">No issues found</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
