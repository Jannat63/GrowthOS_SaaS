import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPostSummary } from "@growthos/types";
import { getAllPosts, formatPostDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on running SEO, Google Ads, and Meta Ads as one system — measurement, creative, and the work between channels.",
};

/**
 * The index.
 *
 * Structurally the same page it was when posts were files — the type scale, the bordered list and
 * the meta line are unchanged, because nothing about the source of the words should change how they
 * read. Two things are new, and both come from fields the console now manages: the lead post gets
 * its cover at full width, and a post with a cover carries a thumbnail on its row.
 *
 * A row without a cover simply has no thumbnail rather than reserving empty space for one. The text
 * column is left-aligned, so nothing misaligns — and a column of grey placeholders would be worse
 * than an honest absence.
 */
export default async function BlogIndex() {
  const posts = await getAllPosts();
  // The API already returns featured-first, so the lead is simply the first row — no second sort
  // here that could disagree with the one the server did.
  const [lead, ...rest] = posts;

  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <p className="font-mono text-[11px] tracking-[0.18em] text-primary">BLOG</p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight">
        Notes from between the channels
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        What we keep running into while building GrowthOS: measurement that doesn&rsquo;t
        reconcile, creative that decays faster than the reporting cadence, and the work that
        falls between three tools.
      </p>

      {posts.length === 0 ? (
        <p className="mt-16 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No posts yet.
        </p>
      ) : (
        <>
          {lead && <Lead post={lead} />}
          {rest.length > 0 && (
            <ul className="mt-4 border-t">
              {rest.map((p) => (
                <li key={p.slug} className="border-b">
                  <Row post={p} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** The first post, given room. Its cover is the one image on this page allowed to be large. */
function Lead({ post }: { post: BlogPostSummary }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group mt-16 block border-t pt-8">
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt={post.coverImageAlt ?? ""}
          className="mb-7 aspect-[2/1] w-full rounded-xl border object-cover"
        />
      )}
      <Meta post={post} />
      <h2 className="mt-3 font-display text-2xl font-bold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-3xl">
        {post.title}
      </h2>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        {post.description}
      </p>
      <Read />
    </Link>
  );
}

function Row({ post }: { post: BlogPostSummary }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex gap-6 py-8">
      <div className="min-w-0 flex-1">
        <Meta post={post} />
        <h2 className="mt-3 font-display text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-2xl">
          {post.title}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{post.description}</p>
        <Read />
      </div>

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt={post.coverImageAlt ?? ""}
          className="hidden h-24 w-36 shrink-0 rounded-lg border object-cover sm:block"
        />
      )}
    </Link>
  );
}

function Meta({ post }: { post: BlogPostSummary }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
      <span className="text-primary">{post.tag.toUpperCase()}</span>
      <span className="text-border">·</span>
      <time dateTime={post.publishedAt ?? undefined}>{formatPostDate(post.publishedAt)}</time>
      <span className="text-border">·</span>
      <span>{post.readingMinutes} MIN</span>
    </div>
  );
}

function Read() {
  return (
    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
      Read
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </span>
  );
}
