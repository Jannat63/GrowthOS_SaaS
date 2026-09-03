"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, Pin, PinOff, Trash2 } from "lucide-react";
import type { BlogPost, RichTextDoc } from "@growthos/types";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  useAdminPost,
  useDeletePost,
  useFeaturePost,
  usePublishPost,
  useUnpublishPost,
  useUpdatePost,
} from "@/lib/hooks/useAdminBlog";
import { RichTextEditor } from "@/components/admin/blog/RichTextEditor";
import { PostMeta, type PostDraft } from "@/components/admin/blog/PostMeta";
import { postStateLabel, stateTone } from "@/components/admin/blog/state";
import { badgeVariantForTone } from "@/components/admin/tone";
import { relativeTime } from "@/lib/utils/time";

/**
 * The one screen in this console that is not a table.
 *
 * Everything else here is dense and scanned; a post is written, so it is built the other way round.
 * The writing column carries `prose-signal` — the same stylesheet the published page uses — at the
 * same measure, so what is on screen is the size, face and leading it will ship at. There is
 * deliberately no preview tab: a preview tab is an admission that the editor lies.
 *
 * Metadata lives in the right column rather than above the body, so the writer faces prose instead
 * of a form. Nothing in that column is required to start writing.
 */

/** Long enough not to fire mid-sentence, short enough that closing the tab is safe. */
const AUTOSAVE_MS = 1_500;

export default function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: post, isLoading, isError } = useAdminPost(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="font-display text-lg font-semibold tracking-tight">Post not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted, or the address may be wrong.
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => router.push("/admin/blog")}>
          Back to the blog
        </Button>
      </div>
    );
  }

  // Keyed on the id so switching posts rebuilds the draft state from scratch rather than carrying
  // one post's unsaved edits into another.
  return <Editor key={post.id} post={post} />;
}

function Editor({ post }: { post: BlogPost }) {
  const router = useRouter();
  const update = useUpdatePost(post.id);
  const publish = usePublishPost(post.id);
  const unpublish = useUnpublishPost(post.id);
  const feature = useFeaturePost(post.id);
  const remove = useDeletePost();

  const [draft, setDraft] = useState<PostDraft>(() => toDraft(post));
  const [body, setBody] = useState<RichTextDoc>(post.body);
  const [words, setWords] = useState(post.wordCount);
  const [savedAt, setSavedAt] = useState<string | null>(post.updatedAt);
  const [dirty, setDirty] = useState(false);

  const patch = useCallback((next: Partial<PostDraft>) => {
    setDraft((d) => ({ ...d, ...next }));
    setDirty(true);
  }, []);

  const onBody = useCallback((doc: RichTextDoc) => {
    setBody(doc);
    setDirty(true);
  }, []);

  const payload = useMemo(
    () => ({
      slug: draft.slug,
      title: draft.title.trim() || "Untitled post",
      description: draft.description,
      body,
      tag: draft.tag,
      coverImageUrl: draft.coverImageUrl || null,
      coverImageAlt: draft.coverImageAlt || null,
      authorName: draft.authorName,
      authorRole: draft.authorRole || null,
      authorAvatarUrl: draft.authorAvatarUrl || null,
    }),
    [draft, body]
  );

  // Autosave. The ref keeps the payload current without the timer restarting on every keystroke
  // being the *only* thing that schedules a save.
  const latest = useRef(payload);
  latest.current = payload;
  const saveRef = useRef(update.mutate);
  saveRef.current = update.mutate;

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      saveRef.current(
        { ...latest.current, silent: true },
        {
          onSuccess: (saved) => {
            setSavedAt(saved.updatedAt);
            setDirty(false);
          },
        }
      );
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, payload]);

  /**
   * The browser's own "are you sure" is the only thing that can interrupt a tab closing, and it is
   * worth having: autosave runs 1.5 seconds behind, so there is always a window in which the last
   * sentence exists only on screen.
   */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const tone = stateTone(post.state);
  const busy = publish.isPending || unpublish.isPending || feature.isPending;

  return (
    <div className="-m-4 flex min-h-full flex-col md:-m-6">
      {/* ── The bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background/90 px-4 py-2.5 backdrop-blur md:px-6">
        <Link
          href="/admin/blog"
          className="flex shrink-0 items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Posts
        </Link>

        <span className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
          {draft.title || "Untitled post"}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SaveState dirty={dirty} pending={update.isPending} savedAt={savedAt} />
          <Badge variant={badgeVariantForTone(tone)}>{postStateLabel(post)}</Badge>

          {post.state === "published" && (
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <a
                href={`/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open on the site"
                title="Open on the site"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={busy}
            aria-label={post.featured ? "Unpin from the blog" : "Pin to the top of the blog"}
            title={post.featured ? "Unpin from the blog" : "Pin to the top of the blog"}
            onClick={() => feature.mutate(!post.featured)}
          >
            {post.featured ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          {/* Delete only exists on a draft, because the API only permits it on a draft. A button
              that is always visible and sometimes refuses teaches an operator to expect an error. */}
          {post.state === "draft" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label="Delete this draft"
              title="Delete this draft"
              onClick={() => {
                if (!window.confirm("Delete this draft? It cannot be recovered.")) return;
                remove.mutate(post.id, { onSuccess: () => router.push("/admin/blog") });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            disabled={update.isPending}
            onClick={() =>
              update.mutate(payload, {
                onSuccess: (saved) => {
                  setSavedAt(saved.updatedAt);
                  setDirty(false);
                },
              })
            }
          >
            Save
          </Button>
        </div>
      </div>

      {/* ── The page ────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col gap-8 px-4 py-8 md:px-6 lg:flex-row lg:gap-10">
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-[68ch]">
            {/* Title and dek are set in the type the published page uses, for the same reason the
                body is: the whole screen is the preview, not just the part below the fold. */}
            <AutoTextarea
              value={draft.title}
              onChange={(v) => patch({ title: v })}
              placeholder="Title"
              aria-label="Post title"
              className="w-full resize-none bg-transparent font-display text-3xl font-bold leading-[1.15] tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
            />
            <AutoTextarea
              value={draft.description}
              onChange={(v) => patch({ description: v })}
              placeholder="One sentence under the title. This is also the description search engines show."
              aria-label="Post description"
              className="mt-5 w-full resize-none bg-transparent text-lg leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/40"
            />
          </div>

          <div className="mx-auto mt-10 max-w-[68ch]">
            <RichTextEditor value={post.body} onChange={onBody} onWordCount={setWords} />
          </div>
        </div>

        <PostMeta
          post={post}
          draft={draft}
          words={words}
          onChange={patch}
          onPublish={(at) => publish.mutate(at ? { publishedAt: at } : {})}
          onUnpublish={() => unpublish.mutate()}
          busy={busy}
        />
      </div>
    </div>
  );
}

// ── Bits ────────────────────────────────────────────────────────────────────

/**
 * Whether the last sentence is safe yet.
 *
 * Autosave with no visible state is the same as no autosave: the writer still does not know whether
 * closing the tab loses anything, so they keep pressing Save anyway. Three states, one line, no
 * toast — a notification every 1.5 seconds while someone is writing is a distraction with a
 * countdown, not reassurance.
 */
function SaveState({
  dirty,
  pending,
  savedAt,
}: {
  dirty: boolean;
  pending: boolean;
  savedAt: string | null;
}) {
  if (pending) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        Saving
      </span>
    );
  }
  if (dirty) return <span className="text-xs text-muted-foreground">Unsaved</span>;
  return (
    <span className="text-xs text-muted-foreground/70">
      Saved {savedAt ? relativeTime(savedAt) : ""}
    </span>
  );
}

/**
 * A textarea that grows with its text.
 *
 * A single-line input for a title that wraps to two lines on the published page would be the first
 * place this screen stopped telling the truth about what ships.
 */
function AutoTextarea({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reset first: without it the box can only ever grow, never shrink back on delete.
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      {...rest}
    />
  );
}

function toDraft(post: BlogPost): PostDraft {
  return {
    title: post.title,
    description: post.description,
    slug: post.slug,
    tag: post.tag,
    coverImageUrl: post.coverImageUrl ?? "",
    coverImageAlt: post.coverImageAlt ?? "",
    authorName: post.author.name,
    authorRole: post.author.role ?? "",
    authorAvatarUrl: post.author.avatarUrl ?? "",
  };
}
