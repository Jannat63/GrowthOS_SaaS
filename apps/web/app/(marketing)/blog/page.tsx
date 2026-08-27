import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllPosts, formatPostDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on running SEO, Google Ads, and Meta Ads as one system — measurement, creative, and the work between channels.",
};

export default function BlogIndex() {
  const posts = getAllPosts();

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
        <ul className="mt-16 border-t">
          {posts.map((p) => (
            <li key={p.slug} className="border-b">
              <Link href={`/blog/${p.slug}`} className="group block py-8">
                <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                  <span className="text-primary">{p.tag.toUpperCase()}</span>
                  <span className="text-border">·</span>
                  <time dateTime={p.date}>{formatPostDate(p.date)}</time>
                  <span className="text-border">·</span>
                  <span>{p.readingMinutes} MIN</span>
                </div>
                <h2 className="mt-3 font-display text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-2xl">
                  {p.title}
                </h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Read
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
