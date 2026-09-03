import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { BlogPost } from "@growthos/types";
import { Button } from "@growthos/ui/components/button";
import { getPost, getPostSlugs, getRelatedPosts, formatPostDate } from "@/lib/blog";
import { PostBody } from "@/components/marketing/PostBody";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growthos.app";

/**
 * Pre-renders the posts that exist at build time. `dynamicParams` stays at its default of true, so
 * a post published from the console after a deploy still renders on its first request rather than
 * 404ing until someone ships again — which is the whole point of moving authoring out of the repo.
 */
export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not found" };

  const cover = absolute(post.coverImageUrl);

  return {
    title: post.title,
    description: post.description,
    // A post lives at one address; without this, a crawler that finds it through a tracking
    // parameter treats that as a separate page competing with the original.
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      // Falls through to the site-wide opengraph-image when a post has no cover of its own.
      ...(cover ? { images: [{ url: cover, alt: post.coverImageAlt ?? post.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      ...(cover ? { images: [cover] } : {}),
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const more = await getRelatedPosts(slug);

  return (
    <article className="mx-auto max-w-2xl px-6 py-20">
      {/* Structured data. The page already says all of this to a person; this says it to a search
          engine in the form it indexes, which is what earns the date, author and image in a result
          rather than a bare blue link. */}
      <script
        type="application/ld+json"
        // The only input is our own post record, serialised by JSON.stringify — no author-supplied
        // markup reaches this, and the sanitiser below closes the one character that could break out.
        dangerouslySetInnerHTML={{ __html: articleSchema(post) }}
      />

      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        ALL POSTS
      </Link>

      <div className="mt-10 flex items-center gap-3 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
        <span className="text-primary">{post.tag.toUpperCase()}</span>
        <span className="text-border">·</span>
        <time dateTime={post.publishedAt ?? undefined}>{formatPostDate(post.publishedAt)}</time>
        <span className="text-border">·</span>
        <span>{post.readingMinutes} MIN</span>
      </div>

      <h1 className="mt-4 font-display text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl">
        {post.title}
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{post.description}</p>

      {/* The byline is a block of its own rather than a fourth item in the meta line above. Who
          wrote something is a different kind of fact from when it went out, and stringing them
          together with another middle dot would flatten both. */}
      <Byline post={post} />

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt={post.coverImageAlt ?? ""}
          className="mt-10 aspect-[2/1] w-full rounded-xl border object-cover"
        />
      )}

      <div className="mt-12 border-t pt-2">
        <PostBody doc={post.body} />
      </div>

      <aside className="mt-16 rounded-2xl border bg-muted/40 p-8">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          This is the problem GrowthOS is built around
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Six bridges between SEO, Google Ads, and Meta Ads, so a signal in one channel becomes
          the next move in another. 14-day trial, no card.
        </p>
        <Button asChild className="mt-6">
          <Link href="/sign-up">
            Start free
            <ArrowRight />
          </Link>
        </Button>
      </aside>

      {more.length > 0 && (
        <div className="mt-16 border-t pt-10">
          <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
            KEEP READING
          </p>
          <ul className="mt-5 space-y-5">
            {more.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group block">
                  <h3 className="font-display font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function Byline({ post }: { post: BlogPost }) {
  return (
    <div className="mt-8 flex items-center gap-3 border-t pt-6">
      {post.author.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.author.avatarUrl}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full border object-cover"
        />
      ) : (
        // An initial rather than a stock silhouette: it is at least true, and it does not pretend
        // to be a photograph of someone.
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-semibold text-muted-foreground"
        >
          {post.author.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 text-sm leading-tight">
        <p className="font-medium">{post.author.name}</p>
        {post.author.role && (
          <p className="mt-0.5 text-muted-foreground">{post.author.role}</p>
        )}
      </div>
    </div>
  );
}

/** Relative covers have to be absolute for a social card — the crawler is not on our origin. */
function absolute(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("/") ? `${SITE_URL}${url}` : url;
}

function articleSchema(post: BlogPost): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.author.name },
    publisher: { "@type": "Organization", name: "GrowthOS" },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    ...(absolute(post.coverImageUrl) ? { image: absolute(post.coverImageUrl) } : {}),
    wordCount: post.wordCount,
  };
  // `</script>` inside a JSON string would otherwise end the block early and spill the rest of the
  // payload into the document as markup. The one escape a JSON-LD block genuinely needs.
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
