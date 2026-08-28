"use client";
import { useState } from "react";
import { FlaskConical, Play, Undo2, Trash2 } from "lucide-react";
import type { ExperimentWinner } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { Textarea } from "@growthos/ui/components/textarea";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  useCreativeExperimentActions,
  useCreativeExperiments,
  type CreativeExperiment,
} from "@/lib/hooks/useCreativeExperiments";

/**
 * Variant experiments (M4 · P4.2a-3).
 *
 * An experiment LOG, and the copy says so. Nothing here publishes an ad — the test runs in the
 * customer's own ad manager, and concluding is an explicitly human act. The product never picks a
 * winner, and any figures the user records are shown as self-reported so nobody later mistakes them
 * for measured data.
 */
const STATUS_VARIANT = {
  draft: "muted",
  running: "default",
  concluded: "success",
} as const;

/** Variants are jsonb — a copy variant, a UGC script, or a plain RSA string. Render what is there. */
function variantPreview(variant: unknown): string {
  if (typeof variant === "string") return variant;
  if (variant && typeof variant === "object") {
    const v = variant as Record<string, unknown>;
    const first = v.hook ?? v.headline ?? v.body ?? Object.values(v)[0];
    return typeof first === "string" ? first : JSON.stringify(variant);
  }
  return String(variant ?? "");
}

export function VariantExperiments({ workspaceId }: { workspaceId: string | null }) {
  const { data: experiments } = useCreativeExperiments(workspaceId);
  const { create, setStatus, conclude, remove } = useCreativeExperimentActions(workspaceId);

  const [showForm, setShowForm] = useState(false);
  const [hypothesis, setHypothesis] = useState("");
  const [successMetric, setSuccessMetric] = useState("CTR");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");

  const canCreate =
    hypothesis.trim() && successMetric.trim() && variantA.trim() && variantB.trim();

  function submit() {
    if (!canCreate) return;
    create.mutate(
      {
        hypothesis: hypothesis.trim(),
        successMetric: successMetric.trim(),
        variantA: variantA.trim(),
        variantB: variantB.trim(),
      },
      {
        onSuccess: () => {
          setHypothesis("");
          setVariantA("");
          setVariantB("");
          setShowForm(false);
        },
      }
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold tracking-tight">Variant experiments</h2>
        </div>
        <Button size="sm" variant={showForm ? "outline" : "default"} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "New experiment"}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        A record of what you tested and why. Run the test in your ad manager, then record what you
        concluded &mdash; GrowthOS doesn&rsquo;t pick a winner for you.
      </p>

      {showForm && (
        <div className="mt-4 grid max-w-xl gap-3 rounded-lg border bg-secondary/30 p-4">
          <div className="grid gap-1.5">
            <Label htmlFor="exp-hypothesis">Hypothesis</Label>
            <Textarea
              id="exp-hypothesis"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="A testimonial-led hook will beat a discount-led hook for cold audiences."
              rows={2}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-a">Variant A</Label>
              <Textarea id="exp-a" value={variantA} onChange={(e) => setVariantA(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-b">Variant B</Label>
              <Textarea id="exp-b" value={variantB} onChange={(e) => setVariantB(e.target.value)} rows={3} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="exp-metric">Success metric</Label>
            <Input
              id="exp-metric"
              value={successMetric}
              onChange={(e) => setSuccessMetric(e.target.value)}
              placeholder="CTR"
              className="max-w-[240px]"
            />
            <p className="text-xs text-muted-foreground">
              However you&rsquo;ll judge it &mdash; CTR, CPA, ROAS. You record the outcome yourself.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={!canCreate || create.isPending}>
              {create.isPending ? "Saving…" : "Create experiment"}
            </Button>
            {create.isError && (
              <span className="text-sm text-destructive">
                {create.error instanceof Error ? create.error.message : "Could not save."}
              </span>
            )}
          </div>
        </div>
      )}

      {!experiments ? (
        <Skeleton className="mt-4 h-32 w-full" />
      ) : experiments.data.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No experiments yet. Pair two variants with a hypothesis to start a record.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {experiments.data.map((exp) => (
            <ExperimentRow
              key={exp.id}
              experiment={exp}
              onStatus={(status) => setStatus.mutate({ id: exp.id, status })}
              onConclude={(body) => conclude.mutate({ id: exp.id, ...body })}
              onDelete={() => remove.mutate(exp.id)}
              busy={setStatus.isPending || conclude.isPending || remove.isPending}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ExperimentRow({
  experiment,
  onStatus,
  onConclude,
  onDelete,
  busy,
}: {
  experiment: CreativeExperiment;
  onStatus: (status: "draft" | "running") => void;
  onConclude: (body: { winner: ExperimentWinner; notes?: string }) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [concluding, setConcluding] = useState(false);
  const [winner, setWinner] = useState<ExperimentWinner>("a");
  const [notes, setNotes] = useState("");

  // Mirrors the engine rule: "we could not tell" is only useful if it says what was seen.
  const notesRequired = winner === "inconclusive" && !notes.trim();

  // Carries its own conclude controls, so it takes the same hover as the other action rows.
  return (
    <li className="rounded-lg border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 focus-within:bg-secondary/50">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium">{experiment.hypothesis}</p>
        <Badge variant={STATUS_VARIANT[experiment.status]}>{experiment.status}</Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border bg-background p-2 text-xs">
          <p className="font-semibold text-muted-foreground">{experiment.variantALabel}</p>
          <p className="mt-1">{variantPreview(experiment.variantA)}</p>
        </div>
        <div className="rounded-md border bg-background p-2 text-xs">
          <p className="font-semibold text-muted-foreground">{experiment.variantBLabel}</p>
          <p className="mt-1">{variantPreview(experiment.variantB)}</p>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">Judged on {experiment.successMetric}</p>

      {experiment.result ? (
        <div className="mt-3 rounded-md border bg-background p-3">
          <p className="text-sm font-medium">
            {experiment.result.winner === "inconclusive"
              ? "Inconclusive"
              : `Winner: ${experiment.result.winner === "a" ? experiment.variantALabel : experiment.variantBLabel}`}
          </p>
          {experiment.result.notes && (
            <p className="mt-1 text-sm text-muted-foreground">{experiment.result.notes}</p>
          )}
          {/* Never presented as measured: the product observed none of this. */}
          <p className="mt-2 text-xs text-muted-foreground">
            Self-reported by the person who concluded this experiment &mdash; not measured by
            GrowthOS.
          </p>
        </div>
      ) : concluding ? (
        <div className="mt-3 grid gap-2 rounded-md border bg-background p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Outcome
            </span>
            {(["a", "b", "inconclusive"] as const).map((w) => (
              <Button
                key={w}
                size="sm"
                variant={winner === w ? "default" : "outline"}
                onClick={() => setWinner(w)}
              >
                {w === "a" ? experiment.variantALabel : w === "b" ? experiment.variantBLabel : "Inconclusive"}
              </Button>
            ))}
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you see?"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={busy || notesRequired}
              onClick={() => onConclude({ winner, notes: notes.trim() || undefined })}
            >
              Record outcome
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConcluding(false)}>
              Cancel
            </Button>
            {notesRequired && (
              <span className="text-xs text-muted-foreground">
                Add a note &mdash; an inconclusive result needs one.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {experiment.status === "draft" ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("running")}>
              <Play className="h-3.5 w-3.5" /> Mark running
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("draft")}>
              <Undo2 className="h-3.5 w-3.5" /> Back to draft
            </Button>
          )}
          <Button size="sm" onClick={() => setConcluding(true)} disabled={busy}>
            Record outcome
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}
    </li>
  );
}
