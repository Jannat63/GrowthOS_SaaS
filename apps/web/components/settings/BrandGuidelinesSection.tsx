"use client";
import { useEffect, useState } from "react";
import { BookType } from "lucide-react";
import { BRAND_TONES, type BrandTone } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { LockedField } from "@/components/LockedField";
import { Label } from "@growthos/ui/components/label";
import { Textarea } from "@growthos/ui/components/textarea";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import {
  useBrandGuidelines,
  useBrandGuidelinesActions,
} from "@/lib/hooks/useBrandGuidelines";

/**
 * Brand guidelines (M4 · P4.2a-1).
 *
 * The three list fields are line-separated textareas rather than a tag input: these are pasted from
 * a brand document far more often than typed one at a time, and a textarea makes pasting twenty
 * banned terms one action instead of twenty.
 */
const toLines = (values: string[]) => values.join("\n");
const fromLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const TONE_HINT: Record<BrandTone, string> = {
  professional: "Measured and credible.",
  friendly: "Warm and conversational.",
  bold: "Direct and high-energy.",
  technical: "Precise, specification-led.",
  playful: "Light and irreverent.",
};

export function BrandGuidelinesSection({ workspaceId }: { workspaceId: string | null }) {
  const { data: guidelines } = useBrandGuidelines(workspaceId);
  const save = useBrandGuidelinesActions(workspaceId);

  const [tone, setTone] = useState<BrandTone>("professional");
  const [bannedTerms, setBannedTerms] = useState("");
  const [requiredDisclaimers, setRequiredDisclaimers] = useState("");
  const [valueProps, setValueProps] = useState("");
  const [targetPersona, setTargetPersona] = useState("");
  const [readingLevel, setReadingLevel] = useState("");

  // Seed the form once guidelines load.
  useEffect(() => {
    if (!guidelines) return;
    const g = guidelines.data;
    setTone(g.tone);
    setBannedTerms(toLines(g.bannedTerms));
    setRequiredDisclaimers(toLines(g.requiredDisclaimers));
    setValueProps(toLines(g.valueProps));
    setTargetPersona(g.targetPersona ?? "");
    setReadingLevel(g.readingLevel == null ? "" : String(g.readingLevel));
  }, [guidelines]);

  // Blank means "no constraint" and is sent as null — distinct from a grade, which the API bounds
  // to 1–20. Anything outside that is blocked here so the user sees it before a round-trip.
  const parsedReadingLevel = readingLevel.trim() === "" ? null : Number(readingLevel);
  const readingLevelValid =
    parsedReadingLevel === null ||
    (Number.isInteger(parsedReadingLevel) && parsedReadingLevel >= 1 && parsedReadingLevel <= 20);

  function onSave() {
    save.mutate({
      tone,
      bannedTerms: fromLines(bannedTerms),
      requiredDisclaimers: fromLines(requiredDisclaimers),
      valueProps: fromLines(valueProps),
      targetPersona: targetPersona.trim() || null,
      readingLevel: parsedReadingLevel,
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <BookType className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Brand guidelines</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Constrains the ad copy, RSA and UGC script generators. Copy containing a banned term is
        dropped rather than rewritten, so a clean, smaller set is returned.
      </p>

      {!guidelines ? (
        <Skeleton className="mt-4 h-64 w-full" />
      ) : (
        <div className="mt-4 grid max-w-xl gap-4">
          <div className="grid gap-1.5">
            <Label>Tone</Label>
            <div className="flex flex-wrap gap-2">
              {BRAND_TONES.map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={tone === t ? "default" : "outline"}
                  onClick={() => setTone(t)}
                  className="capitalize"
                >
                  {t}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{TONE_HINT[tone]}</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="bannedTerms">Banned terms</Label>
            <Textarea
              id="bannedTerms"
              value={bannedTerms}
              onChange={(e) => setBannedTerms(e.target.value)}
              placeholder={"guaranteed\n#1\ncompetitor name"}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              One per line. Matched whole-word and case-insensitively.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="valueProps">Value props</Label>
            <Textarea
              id="valueProps"
              value={valueProps}
              onChange={(e) => setValueProps(e.target.value)}
              placeholder={"free returns\nships in 24h"}
              rows={3}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              One per line. Copy echoing these is ranked first — never dropped for missing them.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="requiredDisclaimers">Required disclaimers</Label>
            <Textarea
              id="requiredDisclaimers"
              value={requiredDisclaimers}
              onChange={(e) => setRequiredDisclaimers(e.target.value)}
              placeholder={"Terms apply.\nT&Cs apply."}
              rows={3}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Appended where the channel&rsquo;s character limit allows. List a shorter fallback
              second — headlines cap at 30 characters.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="targetPersona">Target persona</Label>
            <LockedField
              id="targetPersona"
              label="target persona"
              value={targetPersona}
              onChange={setTargetPersona}
              inputProps={{ placeholder: "Ops leads at mid-market SaaS" }}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="readingLevel">Reading level</Label>
            <LockedField
              id="readingLevel"
              label="reading level"
              value={readingLevel}
              onChange={setReadingLevel}
              className="max-w-[15rem]"
              inputProps={{
                placeholder: "Any",
                inputMode: "numeric",
                className: cn(!readingLevelValid && "border-destructive"),
              }}
            />
            <p className="text-xs text-muted-foreground">
              US grade level, 1&ndash;20. Leave blank for no limit. Only applied to longer copy,
              where the estimate is stable enough to act on.
            </p>
            {!readingLevelValid && (
              <span className="text-xs text-destructive">
                Enter a whole number from 1 to 20, or leave blank.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onSave} disabled={save.isPending || !readingLevelValid}>
              {save.isPending ? "Saving…" : "Save guidelines"}
            </Button>
            {save.isSuccess && !save.isPending && (
              <span className="text-sm text-success">Saved.</span>
            )}
            {save.isError && (
              <span className="text-sm text-destructive">
                {save.error instanceof Error ? save.error.message : "Could not save guidelines."}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
