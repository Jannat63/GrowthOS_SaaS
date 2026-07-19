"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2, Search } from "lucide-react";
import { api } from "@/lib/api/client";
import { contentBriefs } from "@/lib/mock-data/seo";

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

const statusTone: Record<string, "success" | "primary" | "neutral" | "warning"> = {
  Published: "success", "In Progress": "primary", Draft: "warning", "Not Started": "neutral",
};

interface Brief {
  targetKeyword: string;
  searchIntent: string;
  recommendedWordCount: number;
  headingStructure: string[];
  faqQuestions: string[];
  metaTitleSuggestion: string;
  metaDescriptionSuggestion: string;
}

export default function ContentStudioPage() {
  const [keyword, setKeyword] = useState("ergonomic office chair");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);

  async function generateBrief() {
    setLoading(true);
    setBrief(null);
    try {
      const res = await api.get<Brief>(`/api/seo/content/brief?keyword=${encodeURIComponent(keyword)}&difficulty=55`);
      setBrief(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <TopBar subtitle="Real rule-based content brief generator — no paid AI, deterministic structural guidance." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <Card>
          <div className="text-heading-2 mb-3">Generate a Content Brief</div>
          <p className="text-body text-neutral mb-4">
            Classifies search intent and generates a real heading structure, word count target, and FAQ questions — computed live, not from a template library.
          </p>
          <div className="flex gap-3">
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Target keyword" leftIcon={<Search className="h-4 w-4" />} className="flex-1" />
            <Button onClick={generateBrief} loading={loading}>Generate Brief</Button>
          </div>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16 text-neutral">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating...
          </div>
        )}

        {brief && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="text-heading-2">{brief.targetKeyword}</div>
              <Badge tone="primary">{brief.searchIntent}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-caption text-neutral mb-2">Recommended Structure ({brief.recommendedWordCount} words)</div>
                <ul className="space-y-1">
                  {brief.headingStructure.map((h, i) => <li key={i} className="text-body">{i + 1}. {h}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-caption text-neutral mb-2">FAQ Questions to Cover</div>
                <ul className="space-y-1">
                  {brief.faqQuestions.map((q, i) => <li key={i} className="text-body">• {q}</li>)}
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-caption text-neutral">Suggested Meta Title</div>
              <div className="text-body mb-2">{brief.metaTitleSuggestion}</div>
              <div className="text-caption text-neutral">Suggested Meta Description</div>
              <div className="text-body">{brief.metaDescriptionSuggestion}</div>
            </div>
          </Card>
        )}

        <div>
          <div className="text-heading-2 mb-3">Existing Briefs</div>
          <div className="grid grid-cols-2 gap-4">
            {contentBriefs.map((b) => (
              <Card key={b.title}>
                <div className="flex items-center justify-between mb-2">
                  <Badge tone={statusTone[b.status]}>{b.status}</Badge>
                  <span className="text-caption text-neutral">{b.wordTarget.toLocaleString()} word target</span>
                </div>
                <div className="text-heading-2 mb-1">{b.title}</div>
                <p className="text-body text-neutral mb-3">Target keyword: {b.targetKeyword}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${b.score}%` }} />
                  </div>
                  <span className="text-small font-medium">{b.score}/100</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
