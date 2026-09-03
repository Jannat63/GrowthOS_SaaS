"use client";
import { useState } from "react";
import type { AdCopyVariant, UGCDuration, UGCScript } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { cn } from "@/lib/utils/cn";
import { ApiError } from "@/lib/api/client";
import { useCreativeGeneration } from "@/lib/hooks/useCreativeGeneration";

const DURATIONS: UGCDuration[] = [15, 30, 60];
/** What `generateAdCopyVariants` returns by default, before brand guidelines remove any. */
const COPY_VARIANTS = 5;

/**
 * What to put on screen when a generation fails.
 *
 * Only an `ApiError` carries a message written for a person — the API answers every failure with
 * `{ error: { message } }` and those read like "You've reached your starter plan's limit (10) for
 * this feature this month." Anything else is a transport failure whose `message` is a browser
 * internal: rendering `err.message` unconditionally put the literal string "Failed to fetch" in
 * front of the user. An error should say what happened and what to do about it.
 */
const message = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Could not reach the server. Check your connection and try again.";

/**
 * Ad copy variants and a UGC video script, from the workspace's own templates.
 *
 * Generation runs on the SERVER (M4 P4.2a-4), not here. It used to run in this component, which made
 * `aiCreativesPerMonth` a plan limit that could not bind and left the workspace's brand guidelines —
 * a server-held record — unable to constrain anything. The imports above are type-only; no generator
 * code reaches the bundle.
 */
export function AdCopyStudio({
  workspaceId,
  product,
}: {
  workspaceId: string | null;
  product: string;
}) {
  const [benefit, setBenefit] = useState("all-day comfort");
  const [painPoint, setPainPoint] = useState("back pain");
  const [duration, setDuration] = useState<UGCDuration>(30);
  const [variants, setVariants] = useState<AdCopyVariant[] | null>(null);
  const [script, setScript] = useState<UGCScript | null>(null);
  const [dropped, setDropped] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  const copy = useCreativeGeneration(workspaceId);
  const video = useCreativeGeneration(workspaceId);
  const ready = Boolean(product.trim()) && Boolean(workspaceId);

  /**
   * TWO actions, not one button firing both.
   *
   * Both calls are metered, and the server checks the ceiling before doing the work and records
   * usage after it. Fired together from one click they both passed the same starting balance, so a
   * workspace with one creative left could be handed six — and then the second call's 402 was
   * rendered as a page-level error above five variants that had generated fine, with no way to tell
   * which half had failed. `remaining` was read from the first response, computed while the second
   * was still spending, so the count on screen was a race.
   *
   * Separating them makes the spend deliberate and every failure attributable to what caused it.
   */
  function run(kind: "copy" | "video") {
    const p = product.trim();
    if (!p || !workspaceId) return;

    const mutation = kind === "copy" ? copy : video;
    const request =
      kind === "copy"
        ? ({ kind: "ad-copy", product: p, benefit: benefit.trim(), painPoint: painPoint.trim() } as const)
        : ({ kind: "ugc-script", product: p, duration } as const);

    mutation.mutate(request, {
      onSuccess: (res) => {
        if (kind === "copy") setVariants(res.adCopy ?? []);
        else setScript(res.script ?? null);
        setDropped(res.dropped.length);
        setRemaining(res.remaining);
      },
    });
  }

  return (
    <Card className="p-6">
      <h3 className="font-display text-base font-semibold tracking-tight">Write the ads</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Hook, body and call to action in {COPY_VARIANTS} variants, plus a shot-by-shot script for a
        creator-style video. Your brand guidelines are applied before anything comes back.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="copy-benefit">Key benefit</Label>
          <Input
            id="copy-benefit"
            value={benefit}
            onChange={(e) => setBenefit(e.target.value)}
            placeholder="all-day comfort"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="copy-pain">Pain point</Label>
          <Input
            id="copy-pain"
            value={painPoint}
            onChange={(e) => setPainPoint(e.target.value)}
            placeholder="back pain"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Action
          label={copy.isPending ? "Writing…" : "Write ad copy"}
          cost={`${COPY_VARIANTS} creatives`}
          disabled={!ready || copy.isPending}
          onClick={() => run("copy")}
          error={copy.error ? message(copy.error) : null}
        />
        <Action
          label={video.isPending ? "Writing…" : "Write video script"}
          cost="1 creative"
          disabled={!ready || video.isPending}
          onClick={() => run("video")}
          error={video.error ? message(video.error) : null}
        >
          <div className="flex items-center gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                aria-pressed={duration === d}
                aria-label={`${d} second script`}
                className={cn(
                  "rounded-md border px-2.5 py-1 font-mono text-sm font-medium transition-colors",
                  duration === d
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-primary/10"
                )}
              >
                {d}s
              </button>
            ))}
          </div>
        </Action>
      </div>

      {/*
        The allowance is stated whatever happened. It used to be suppressed whenever an error was
        set — so the one moment a reader most needs to know how much is left, running out, was the
        one moment it was hidden.
      */}
      {(remaining !== null || dropped > 0) && (
        <p className="mt-3 text-xs text-muted-foreground">
          {remaining !== null && <>{remaining} creatives left this month. </>}
          {dropped > 0 && (
            <>
              {dropped} variant{dropped === 1 ? "" : "s"} removed by your brand guidelines.
            </>
          )}
        </p>
      )}

      {(variants || script) && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {variants && (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                Ad copy · {variants.length} variant{variants.length === 1 ? "" : "s"}
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
          )}

          {script && (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                Video script · {script.durationSeconds}s
              </p>
              <div className="space-y-2.5 rounded-lg border bg-secondary/30 p-4 text-sm">
                <ScriptLine label="Hook" value={script.hook} />
                <ScriptLine label="Demo" value={script.demo} />
                <ScriptLine label="Testimonial" value={script.testimonial} />
                <ScriptLine label="Call to action" value={script.cta} />
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** One metered action: what it does, what it costs, and where its own failure is reported. */
function Action({
  label,
  cost,
  disabled,
  onClick,
  error,
  children,
}: {
  label: string;
  cost: string;
  disabled: boolean;
  onClick: () => void;
  error: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onClick} disabled={disabled}>
          {label}
        </Button>
        {children}
      </div>
      {/* The price is next to the button that charges it, not in a footnote after the fact. */}
      <p className="mt-1.5 text-xs text-muted-foreground">Uses {cost} from your monthly allowance.</p>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ScriptLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}
