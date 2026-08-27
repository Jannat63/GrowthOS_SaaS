import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { getPost, getPostSlugs, getAllPosts, formatPostDate } from "@/lib/blog";
import { MdxContent } from "@/components/marketing/MdxContent";

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const more = getAllPosts()
    .filter((p) => p.slug !== slug)
    .slice(0, 2);

  return (
    <article className="mx-auto max-w-2xl px-6 py-20">
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
        <time dateTime={post.date}>{formatPostDate(post.date)}</time>
        <span className="text-border">·</span>
        <span>{post.readingMinutes} MIN</span>
      </div>

      <h1 className="mt-4 font-display text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl">
        {post.title}
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{post.description}</p>

      <div className="mt-12 border-t pt-2">
        <MdxContent source={post.body} />
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
