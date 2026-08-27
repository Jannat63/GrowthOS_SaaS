"use client";
import { useState } from "react";
import { Clapperboard, Wand2 } from "lucide-react";
import type { AdCopyVariant, UGCDuration, UGCScript } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { cn } from "@/lib/utils/cn";
import { useCreativeGeneration } from "@/lib/hooks/useCreativeGeneration";

const DURATIONS: UGCDuration[] = [15, 30, 60];

// Generation runs on the SERVER (M4 P4.2a-4), not here. It used to run in this component, which
// made `aiCreativesPerMonth` a plan limit that could not bind and left the workspace's brand
// guidelines — a server-held record — unable to constrain anything. The imports above are
// type-only; no generator code reaches the bundle.
export function AdCopyStudio({ workspaceId }: { workspaceId: string | null }) {
  const [product, setProduct] = useState("Ergonomic Chair");
  const [benefit, setBenefit] = useState("all-day comfort");
  const [painPoint, setPainPoint] = useState("back pain");
  const [duration, setDuration] = useState<UGCDuration>(30);
  const [variants, setVariants] = useState<AdCopyVariant[] | null>(null);
  const [script, setScript] = useState<UGCScript | null>(null);
  const [dropped, setDropped] = useState<number>(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  const generateCopy = useCreativeGeneration(workspaceId);
  const generateScript = useCreativeGeneration(workspaceId);
  const pending = generateCopy.isPending || generateScript.isPending;
  const error = generateCopy.error ?? generateScript.error;

  function generate() {
    const p = product.trim();
    if (!p || !workspaceId) return;

    generateCopy.mutate(
      { kind: "ad-copy", product: p, benefit: benefit.trim(), painPoint: painPoint.trim() },
      {
        onSuccess: (res) => {
          setVariants(res.adCopy ?? []);
          setDropped(res.dropped.length);
          setRemaining(res.remaining);
        },
      }
    );

    generateScript.mutate(
      { kind: "ugc-script", product: p, duration },
      { onSuccess: (res) => setScript(res.script ?? null) }
    );
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
        <Button onClick={generate} disabled={!product.trim() || !workspaceId || pending}>
          {pending ? "Generating…" : "Generate"}
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

      {/* A 402 from the plan limit surfaces here as the API's own message ("You've reached your
          starter plan's limit…"), rather than being swallowed and replaced with local output. */}
      {error && (
        <p className="mt-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not generate creatives."}
        </p>
      )}

      {(remaining !== null || dropped > 0) && !error && (
        <p className="mt-3 text-xs text-muted-foreground">
          {remaining !== null && <>{remaining} creatives left this month. </>}
          {dropped > 0 && (
            <>
              {dropped} variant{dropped === 1 ? "" : "s"} dropped by your brand guidelines.
            </>
          )}
        </p>
      )}

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
