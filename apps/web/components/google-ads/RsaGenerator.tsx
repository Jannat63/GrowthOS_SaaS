"use client";
import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { useCreativeGeneration } from "@/lib/hooks/useCreativeGeneration";

// Generation runs on the SERVER (M4 P4.2a-4), not here — see AdCopyStudio.tsx for the full why.
// Server-side is also where required disclaimers get appended within Google's 30/90 character
// caps, which a browser-side generator could not do without the workspace's guidelines record.
export function RsaGenerator({ workspaceId }: { workspaceId: string | null }) {
  const [keyword, setKeyword] = useState("ergonomic office chair");
  const [audience, setAudience] = useState("Professionals");
  const [result, setResult] = useState<{ headlines: string[]; descriptions: string[] } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const generation = useCreativeGeneration(workspaceId);

  function generate() {
    const kw = keyword.trim();
    if (!kw || !workspaceId) return;
    generation.mutate(
      { kind: "rsa", keyword: kw, audience: audience.trim() || "Professionals" },
      {
        onSuccess: (res) => {
          setResult({ headlines: res.headlines ?? [], descriptions: res.descriptions ?? [] });
          setRemaining(res.remaining);
        },
      }
    );
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
        Responsive Search Ad headlines and descriptions, built to Google&apos;s character limits.
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
        <Button onClick={generate} disabled={!keyword.trim() || !workspaceId || generation.isPending}>
          {generation.isPending ? "Generating…" : "Generate"}
        </Button>
      </div>

      {/* A 402 from the plan limit surfaces as the API's own message rather than being swallowed. */}
      {generation.error && (
        <p className="mt-3 text-sm text-destructive">
          {generation.error instanceof Error ? generation.error.message : "Could not generate copy."}
        </p>
      )}
      {remaining !== null && !generation.error && (
        <p className="mt-3 text-xs text-muted-foreground">{remaining} creatives left this month.</p>
      )}

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
