"use client";
import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { generateRsaHeadlines, generateRsaDescriptions } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";

// Fully client-side: runs the @growthos/logic RSA generator (deterministic templating, no LLM/API).
export function RsaGenerator() {
  const [keyword, setKeyword] = useState("ergonomic office chair");
  const [audience, setAudience] = useState("Professionals");
  const [result, setResult] = useState<{ headlines: string[]; descriptions: string[] } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function generate() {
    const kw = keyword.trim();
    if (!kw) return;
    setResult({
      headlines: generateRsaHeadlines(kw, audience.trim() || "Professionals"),
      descriptions: generateRsaDescriptions(kw),
    });
  }

  function copy(text: string) {
    void navigator.clipboard?.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied((c) => (c === text ? null : c)), 1500);
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold tracking-tight">RSA copy generator</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Responsive Search Ad headlines &amp; descriptions from templates — within Google&apos;s
        character limits, no AI required.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="rsa-keyword">Keyword</Label>
          <Input
            id="rsa-keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rsa-audience">Audience</Label>
          <Input
            id="rsa-audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
        </div>
        <Button onClick={generate} disabled={!keyword.trim()}>
          Generate
        </Button>
      </div>

      {result && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <RsaList title="Headlines" limit={30} items={result.headlines} copied={copied} onCopy={copy} />
          <RsaList title="Descriptions" limit={90} items={result.descriptions} copied={copied} onCopy={copy} />
        </div>
      )}
    </Card>
  );
}

function RsaList({
  title,
  limit,
  items,
  copied,
  onCopy,
}: {
  title: string;
  limit: number;
  items: string[];
  copied: string | null;
  onCopy: (text: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} <span className="font-normal normal-case">(≤{limit} chars)</span>
      </p>
      <ul className="space-y-1.5">
        {items.map((text) => (
          <li
            key={text}
            className="group flex items-center justify-between gap-2 rounded-md border bg-secondary/30 px-3 py-2 text-sm"
          >
            <span className="truncate">{text}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="tabular-nums text-xs text-muted-foreground">{text.length}</span>
              <button
                type="button"
                onClick={() => onCopy(text)}
                aria-label="Copy"
                className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              >
                {copied === text ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
