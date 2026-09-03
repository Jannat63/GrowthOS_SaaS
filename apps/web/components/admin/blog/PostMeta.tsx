"use client";

import { useState } from "react";
import { CalendarClock, Globe, Undo2 } from "lucide-react";
import type { BlogPost } from "@growthos/types";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { ImageAddressField } from "@/components/admin/blog/ImageAddressField";
import { absoluteTime } from "@/lib/utils/time";

/**
 * Everything about a post that is not the post.
 *
 * A right column rather than a header, so the writer's first sight of the screen is prose. Nothing
 * here is required to start writing — the address derives from the title, the byline defaults to
 * whoever opened it, and a draft with no cover and no tag saves perfectly well.
 */

export interface PostDraft {
  title: string;
  description: string;
  slug: string;
  tag: string;
  coverImageUrl: string;
  coverImageAlt: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl: string;
}

export function PostMeta({
  post,
  draft,
  words,
  onChange,
  onPublish,
  onUnpublish,
  busy,
}: {
  post: BlogPost;
  draft: PostDraft;
  words: number;
  onChange: (next: Partial<PostDraft>) => void;
  /** ISO string to schedule; undefined to publish now. */
  onPublish: (at?: string) => void;
  onUnpublish: () => void;
  busy: boolean;
}) {
  // Reading time is recomputed here rather than read off the post, so it tracks what is on screen
  // rather than what was last saved. Same 220wpm and the same floor of 1 the API stores.
  const minutes = Math.max(1, Math.round(words / 220));

  return (
    <aside className="w-full shrink-0 space-y-7 lg:w-72">
      <Visibility
        post={post}
        draft={draft}
        words={words}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
        busy={busy}
      />

      <Section title="Address">
        <div className="space-y-1.5">
          <Label htmlFor="post-slug" className="sr-only">
            Address
          </Label>
          <div className="flex items-center rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
            <span className="shrink-0 pl-3 font-mono text-xs text-muted-foreground">/blog/</span>
            <Input
              id="post-slug"
              value={draft.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              className="border-0 pl-1 font-mono text-xs shadow-none focus-visible:ring-0"
            />
          </div>
          {post.state === "published" && draft.slug !== post.slug && (
            // The one edit on this page that breaks something outside it, so it is the one that
            // gets a warning. There is no redirect table, and saying so is more use than implying
            // the change is free.
            <p className="text-xs text-warning">
              This post is live. Changing its address breaks every existing link to it.
            </p>
          )}
        </div>
      </Section>

      <Section title="Cover">
        <ImageAddressField
          id="post-cover"
          label="Image"
          value={draft.coverImageUrl}
          onChange={(v) => onChange({ coverImageUrl: v })}
          optional
        />
        {draft.coverImageUrl.trim() !== "" && (
          <div className="space-y-1.5">
            <Label htmlFor="post-cover-alt">Alt text</Label>
            <Input
              id="post-cover-alt"
              value={draft.coverImageAlt}
              onChange={(e) => onChange({ coverImageAlt: e.target.value })}
              placeholder="What the image shows"
            />
          </div>
        )}
      </Section>

      <Section title="Tag">
        <Label htmlFor="post-tag" className="sr-only">
          Tag
        </Label>
        <Input
          id="post-tag"
          value={draft.tag}
          onChange={(e) => onChange({ tag: e.target.value })}
          placeholder="Measurement"
        />
      </Section>

      <Section title="Byline">
        <div className="space-y-1.5">
          <Label htmlFor="post-author">Name</Label>
          <Input
            id="post-author"
            value={draft.authorName}
            onChange={(e) => onChange({ authorName: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="post-author-role">Role</Label>
          <Input
            id="post-author-role"
            value={draft.authorRole}
            onChange={(e) => onChange({ authorRole: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <ImageAddressField
          id="post-author-avatar"
          label="Photo"
          value={draft.authorAvatarUrl}
          onChange={(v) => onChange({ authorAvatarUrl: v })}
          optional
        />
      </Section>

      <div className="border-t pt-4">
        <dl className="space-y-1.5 font-mono text-xs tabular-nums text-muted-foreground">
          <Stat label="Words" value={words.toLocaleString()} />
          {/* The exact figure the published page prints, so nobody is surprised by it later. */}
          <Stat label="Reading time" value={`${minutes} min`} />
        </dl>
      </div>
    </aside>
  );
}

// ── Visibility ──────────────────────────────────────────────────────────────

/**
 * What a post still needs before it can go out.
 *
 * Saving asks for nothing — a draft is allowed to be unfinished, and demanding a dek before the
 * first sentence is written puts the requirement on the wrong verb. Publishing is where it is
 * enforced (server-side, in publishPost), and the button says so here rather than letting someone
 * click and receive a toast. The description matters because it is also the meta description and
 * the social card's text: publishing without one ships a live page that describes itself as nothing.
 */
function blockingReason(draft: PostDraft, words: number): string | null {
  const title = draft.title.trim();
  if (title === "" || title === "Untitled post") return "Give it a title first.";
  if (draft.description.trim() === "") return "Write the one-line description first.";
  if (words === 0) return "The body is empty.";
  return null;
}

function Visibility({
  post,
  draft,
  words,
  onPublish,
  onUnpublish,
  busy,
}: {
  post: BlogPost;
  draft: PostDraft;
  words: number;
  onPublish: (at?: string) => void;
  onUnpublish: () => void;
  busy: boolean;
}) {
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState("");
  const blocked = blockingReason(draft, words);

  return (
    <Section title="Visibility">
      {post.state === "draft" ? (
        <div className="space-y-2">
          <Button className="w-full" disabled={busy || blocked !== null} onClick={() => onPublish()}>
            <Globe className="h-4 w-4" />
            Publish now
          </Button>

          {blocked && <p className="text-xs text-muted-foreground">{blocked}</p>}

          {scheduling ? (
            <div className="space-y-2 rounded-md border p-3">
              <Label htmlFor="post-schedule" className="text-xs">
                Goes out at
              </Label>
              {/* A native datetime input rather than a calendar component: this asks for one
                  moment, the browser already knows the operator's locale and timezone, and it is
                  keyboard-first without any work. */}
              <Input
                id="post-schedule"
                type="datetime-local"
                value={when}
                min={toLocalInput(new Date())}
                onChange={(e) => setWhen(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!when || busy || blocked !== null}
                  onClick={() => onPublish(new Date(when).toISOString())}
                >
                  Schedule
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setScheduling(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              disabled={busy || blocked !== null}
              onClick={() => setScheduling(true)}
            >
              <CalendarClock className="h-4 w-4" />
              Schedule instead
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {post.state === "scheduled" ? "Goes out" : "Live since"}{" "}
            <span className="text-foreground">{absoluteTime(post.publishedAt)}</span>.
          </p>
          <Button variant="outline" className="w-full" disabled={busy} onClick={onUnpublish}>
            <Undo2 className="h-4 w-4" />
            {post.state === "scheduled" ? "Cancel and keep as draft" : "Unpublish"}
          </Button>
        </div>
      )}
    </Section>
  );
}

// ── Furniture ───────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

/** `datetime-local` wants local wall-clock time with no zone, which toISOString does not give. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
