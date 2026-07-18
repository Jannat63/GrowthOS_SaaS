"use client";
import { useState } from "react";
import { Clapperboard, Wand2 } from "lucide-react";
import {
  generateAdCopyVariants,
  generateUGCScript,
  type AdCopyVariant,
  type UGCDuration,
  type UGCScript,
} from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { cn } from "@/lib/utils/cn";

const DURATIONS: UGCDuration[] = [15, 30, 60];

// Fully client-side: runs the @growthos/logic ad-copy + UGC generators (templating, no LLM).
export function AdCopyStudio() {
  const [product, setProduct] = useState("Ergonomic Chair");
  const [benefit, setBenefit] = useState("all-day comfort");
  const [painPoint, setPainPoint] = useState("back pain");
  const [duration, setDuration] = useState<UGCDuration>(30);
  const [variants, setVariants] = useState<AdCopyVariant[] | null>(null);
  const [script, setScript] = useState<UGCScript | null>(null);

  function generate() {
    const p = product.trim();
    if (!p) return;
    setVariants(generateAdCopyVariants(p, benefit.trim(), painPoint.trim()));
    setScript(generateUGCScript(p, duration));
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Ad copy &amp; UGC studio</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Hook / body / CTA variants and a UGC video script from templates — deterministic, no AI.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="copy-product">Product</Label>
          <Input id="copy-product" value={product} onChange={(e) => setProduct(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="copy-benefit">Key benefit</Label>
          <Input id="copy-benefit" value={benefit} onChange={(e) => setBenefit(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="copy-pain">Pain point</Label>
          <Input id="copy-pain" value={painPoint} onChange={(e) => setPainPoint(e.target.value)} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={generate} disabled={!product.trim()}>
          Generate
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">UGC length:</span>
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-sm font-medium transition-colors",
                duration === d
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary/60"
              )}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {variants && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ad copy variants
            </p>
            <ul className="space-y-2">
              {variants.map((v, i) => (
                <li key={i} className="rounded-lg border bg-secondary/30 p-3 text-sm">
                  <p className="font-medium">{v.hook}</p>
                  <p className="mt-1 text-muted-foreground">{v.body}</p>
                  <p className="mt-1.5 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {v.cta}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {script && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clapperboard className="h-3.5 w-3.5" />
                UGC script ({script.durationSeconds}s)
              </p>
              <div className="space-y-2 rounded-lg border bg-secondary/30 p-4 text-sm">
                <ScriptLine label="Hook" value={script.hook} />
                <ScriptLine label="Demo" value={script.demo} />
                <ScriptLine label="Testimonial" value={script.testimonial} />
                <ScriptLine label="CTA" value={script.cta} />
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ScriptLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}
