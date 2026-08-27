import type { ContentBriefStatus } from "@growthos/types";

/**
 * The editorial pipeline, as a real sequence.
 *
 * A brief genuinely moves through these in order — the numbering below is the document's own
 * progress, not decoration. The stages have been in the schema since `content_briefs` was created
 * and nothing ever wrote or displayed them, which is how a page called "Content Pipeline" ended up
 * with no pipeline in it.
 */
export const STAGES: {
  key: ContentBriefStatus;
  label: string;
  /** The verb that moves a brief INTO this stage, shown on the button that does it. */
  advance: string;
  blurb: string;
}[] = [
  { key: "draft", label: "Draft", advance: "Move back to draft", blurb: "Generated, not yet reviewed." },
  { key: "approved", label: "Approved", advance: "Approve brief", blurb: "Signed off, ready to write." },
  { key: "in_progress", label: "Writing", advance: "Start writing", blurb: "Being written now." },
  { key: "published", label: "Published", advance: "Mark published", blurb: "Live, and ranking from here on." },
];

export const stageIndex = (s: ContentBriefStatus): number =>
  Math.max(0, STAGES.findIndex((x) => x.key === s));

export const stageLabel = (s: ContentBriefStatus): string =>
  STAGES.find((x) => x.key === s)?.label ?? s;

/** The stage after this one, or null at the end of the pipeline. */
export function nextStage(s: ContentBriefStatus): (typeof STAGES)[number] | null {
  return STAGES[stageIndex(s) + 1] ?? null;
}
