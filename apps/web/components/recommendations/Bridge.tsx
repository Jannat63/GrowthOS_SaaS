"use client";
import { channelLabel } from "@growthos/logic";
import { cn } from "@/lib/utils/cn";

/**
 * The bridge a recommendation crosses, drawn in the two channels' own colours.
 *
 * Every recommendation is a signal that started in one channel and lands in another — the six
 * directed bridges are the product's whole thesis, and `sourceChannel`/`targetChannel` have been on
 * every row since M2. Neither reached this page: the queue rendered a title and a number, so
 * nothing on screen said what *kind* of work a row was until you read the sentence. The Growth
 * Hub's summary widget already drew this, which left the dedicated page showing less than its own
 * summary.
 *
 * Placed first and at a fixed position in every row, so the column can be scanned vertically to
 * pick out one kind of work without reading a word.
 */

const CHANNEL_VAR: Record<string, string> = {
  seo: "var(--channel-seo)",
  organic: "var(--channel-seo)",
  google_search_console: "var(--channel-seo)",
  google_ads: "var(--channel-google)",
  meta_ads: "var(--channel-meta)",
};

// An unmapped channel still has to draw as something; the muted token keeps it legible in both
// themes rather than falling through to a transparent dot.
const channelVar = (slug: string) => CHANNEL_VAR[slug] ?? "var(--muted-foreground)";

function Dot({ channel }: { channel: string }) {
  return (
    <span
      aria-hidden
      className="h-2 w-2 shrink-0 rounded-full"
      // Dynamic by row: which of the three channel tokens applies depends on the data, so this
      // cannot be a static utility class. The value is a token reference, never a literal colour,
      // so it still follows the theme.
      style={{ background: channelVar(channel) }}
    />
  );
}

export function Bridge({
  from,
  to,
  className,
}: {
  from: string;
  to: string;
  className?: string;
}) {
  const sameChannel = from === to;
  const label = sameChannel
    ? channelLabel(from)
    : `${channelLabel(from)} to ${channelLabel(to)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}
      title={label}
    >
      <Dot channel={from} />
      {/*
        A fatigue alert starts and ends in the same channel — there is no bridge to draw, and an
        arrow pointing from Meta to Meta would be a claim about the data that isn't true. It renders
        as a single station instead.
      */}
      {!sameChannel && (
        <>
          <span
            aria-hidden
            className="h-px w-4 shrink-0"
            style={{
              backgroundImage: `linear-gradient(90deg, ${channelVar(from)}, ${channelVar(to)})`,
            }}
          />
          <Dot channel={to} />
        </>
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}
