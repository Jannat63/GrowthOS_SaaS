"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Pin, Plus } from "lucide-react";
import type { BlogPostFilter, BlogPostSort, BlogPostSummary } from "@growthos/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@growthos/ui/components/table";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { BLOG_PAGE_SIZE, useAdminPosts, useCreatePost } from "@/lib/hooks/useAdminBlog";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { AdminSearch } from "@/components/admin/AdminSearch";
import {
  FilterChips,
  LinkedRow,
  Pager,
  RowLink,
  SortSelect,
  type FilterOption,
} from "@/components/admin/Directory";
import { absoluteTime, relativeTime } from "@/lib/utils/time";
import { postStateLabel, stateTone } from "@/components/admin/blog/state";
import { badgeVariantForTone } from "@/components/admin/tone";

/**
 * The blog, as a directory.
 *
 * Same furniture as Workspaces and People on purpose — search, chips, sort, spine, pager. The
 * editor is where this surface earns a different shape; a list of posts is still a list, and
 * inventing new controls for it would cost an operator the one thing consistency buys them.
 *
 * The spine follows the console's existing rule (see tone.ts): colour says what needs a human, and
 * nothing else. A draft is gold because it is waiting on you. Scheduled and published are neutral —
 * both are doing exactly what they were told to.
 */

const FILTERS: FilterOption<BlogPostFilter>[] = [
  { value: "draft", label: "Drafts" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

const SORTS: FilterOption<BlogPostSort>[] = [
  { value: "updated", label: "Recently edited" },
  { value: "published", label: "Recently published" },
  { value: "title", label: "Title, A–Z" },
];

/** A new post starts as a real draft with real words in it, not as an empty form. */
const STARTER = {
  title: "Untitled post",
  description: "",
  body: { type: "doc" as const, content: [{ type: "paragraph" }] },
};

export default function AdminBlogPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BlogPostFilter | undefined>(undefined);
  const [sort, setSort] = useState<BlogPostSort>("updated");
  const [offset, setOffset] = useState(0);
  const debounced = useDebouncedValue(search);

  useEffect(() => setOffset(0), [debounced, filter, sort]);

  const { data, isLoading } = useAdminPosts({
    search: debounced,
    filter,
    sort,
    offset,
    limit: BLOG_PAGE_SIZE,
  });
  const create = useCreatePost();

  const rows = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Blog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What goes out on growthos.app/blog. Published posts are live to everyone.
          </p>
        </div>
        <Button
          disabled={create.isPending}
          onClick={() =>
            // Written down before it is opened: autosave then behaves the same on the first
            // keystroke as on the thousandth, and closing the tab cannot lose a post that was
            // never saved.
            create.mutate(STARTER, { onSuccess: (post) => router.push(`/admin/blog/${post.id}`) })
          }
        >
          <Plus className="h-4 w-4" />
          {create.isPending ? "Creating…" : "New post"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <AdminSearch
            value={search}
            onChange={setSearch}
            placeholder="Search titles, addresses, text"
            label="Search posts"
          />
        </div>
        <SortSelect options={SORTS} value={sort} onChange={setSort} label="Sort posts" />
      </div>

      <FilterChips options={FILTERS} value={filter} onChange={setFilter} label="Filter posts" />

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead className="text-right">Words</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Edited</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-24 w-full" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    {debounced
                      ? `Nothing matches “${debounced}”.`
                      : filter === "draft"
                        ? "No drafts — everything is either scheduled or out."
                        : filter === "scheduled"
                          ? "Nothing is queued to go out."
                          : filter === "published"
                            ? "Nothing is live yet."
                            : "No posts yet. Write the first one."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((post) => <PostRow key={post.id} post={post} />)
              )}
            </TableBody>
          </Table>
        </div>
        <Pager
          offset={offset}
          limit={BLOG_PAGE_SIZE}
          total={data?.total ?? 0}
          noun="post"
          onOffsetChange={setOffset}
        />
      </div>
    </div>
  );
}

function PostRow({ post }: { post: BlogPostSummary }) {
  const tone = stateTone(post.state);

  return (
    <LinkedRow tone={tone}>
      <TableCell className="max-w-md">
        <RowLink href={`/admin/blog/${post.id}`}>
          <span className="flex items-center gap-2">
            {/* Ember, and the only ember on this page. tone.ts reserves it for the operator's own
                actions rather than for a state, and a pin is exactly that: something you did. */}
            {post.featured && (
              <Pin className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Pinned" />
            )}
            <span className="truncate font-medium transition-colors group-hover:text-primary">
              {post.title}
            </span>
          </span>
        </RowLink>
        <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
          /blog/{post.slug}
        </span>
      </TableCell>

      <TableCell>
        <Badge variant={badgeVariantForTone(tone)}>{postStateLabel(post)}</Badge>
      </TableCell>

      <TableCell className="text-sm text-muted-foreground">{post.tag}</TableCell>

      <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
        {post.wordCount.toLocaleString()}
      </TableCell>

      <TableCell className="text-sm text-muted-foreground">
        {post.publishedAt ? (
          <time dateTime={post.publishedAt} title={absoluteTime(post.publishedAt)}>
            {relativeTime(post.publishedAt)}
          </time>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </TableCell>

      <TableCell className="text-sm text-muted-foreground">
        <time dateTime={post.updatedAt} title={absoluteTime(post.updatedAt)}>
          {relativeTime(post.updatedAt)}
        </time>
      </TableCell>

      {/*
        An explicit Edit, spelled out.

        The whole row is already a link to the same place, which is the console's directory idiom
        and stays — but a directory of accounts and a list of posts are read with different
        expectations. Nobody hunts for a verb on an account row; on a post they look for "Edit", and
        if the only affordance is that the row happens to be clickable, they do not find it. That
        happened.

        Both actions need `relative z-10` to sit above the row's stretched link.
      */}
      <TableCell className="text-right">
        <div className="relative z-10 flex items-center justify-end gap-1">
          <Link
            href={`/admin/blog/${post.id}`}
            aria-label={`Edit ${post.title}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            Edit
          </Link>
          {post.state === "published" && (
            <a
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${post.title} on the site`}
              title="Open on the site"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </TableCell>
    </LinkedRow>
  );
}
