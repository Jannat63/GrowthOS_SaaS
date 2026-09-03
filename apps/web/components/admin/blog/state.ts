import type { BlogPostState, BlogPostSummary } from "@growthos/types";
import type { Tone } from "@/components/admin/tone";

/**
 * How a post's publish state reads and looks in the console.
 *
 * **Only "draft" gets colour**, which follows tone.ts rather than inventing a scale for this page:
 * colour says what needs a human, and nothing else. A draft is unfinished work waiting on you.
 * Scheduled and published are both doing exactly what they were told to, so both are neutral — and
 * deliberately no green on published, for the same reason tone.ts refuses green on healthy rows:
 * a hue that appears on most rows stops meaning anything.
 */
export function stateTone(state: BlogPostState): Tone {
  return state === "draft" ? "attention" : "neutral";
}

/**
 * The label. "Scheduled" alone is not an answer — the useful part of a scheduled post is *when*,
 * so the date is in the label rather than a column away from it.
 */
export function postStateLabel(post: Pick<BlogPostSummary, "state" | "publishedAt">): string {
  if (post.state === "draft") return "Draft";
  if (post.state === "published") return "Published";
  const when = post.publishedAt ? new Date(post.publishedAt) : null;
  if (!when) return "Scheduled";
  return `Scheduled ${when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
