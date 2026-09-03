import type { BlogPost, BlogPostSummary } from "@growthos/types";

/**
 * The public blog's reader.
 *
 * These were MDX files read off disk with `fs` at build time. They are rows now, written in the
 * Super Admin console, so this reads the API's public endpoints instead. The shape of the module is
 * unchanged on purpose — every consumer still goes through these functions, which is what made
 * swapping the source a contained change rather than a rewrite.
 *
 * **Still statically rendered.** Each call is cached by Next with a 300s revalidate window, so a
 * crawler and a reader both get pre-rendered HTML exactly as before. Publishing does not wait for
 * that window: the API pings /api/revalidate on write (see apps/api/src/blog-revalidate.ts), so a
 * post appears immediately.
 *
 * **A failure here is never a 500.** The marketing site used to be files that could not fail, and
 * moving it behind a service must not make an API blip take the front of the site down with it —
 * so the list falls back to empty, a post falls back to null, and the pages render their existing
 * "no posts" and 404 states. Loudly logged, quietly survived.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Long enough that the blog costs the API almost nothing; irrelevant in practice, because a
 *  publish revalidates on demand rather than waiting this out. */
const REVALIDATE_SECONDS = 300;

/** The tag every blog fetch carries, so one `revalidateTag` can clear all of them at once. */
export const BLOG_CACHE_TAG = "blog";

export type { BlogPost, BlogPostSummary };

async function read<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: [BLOG_CACHE_TAG] },
    });
    // 404 is an answer, not a failure — a post that does not exist should not log an error on every
    // crawl of a stale link.
    if (res.status === 404) return fallback;
    if (!res.ok) {
      console.error(`[blog] ${path} returned ${res.status}`);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[blog] could not reach the API for ${path}`, err);
    return fallback;
  }
}

export async function getAllPosts(): Promise<BlogPostSummary[]> {
  const result = await read<{ data: BlogPostSummary[]; total: number }>("/blog?limit=100", {
    data: [],
    total: 0,
  });
  return result.data;
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  return read<BlogPost | null>(`/blog/${encodeURIComponent(slug)}`, null);
}

/** The two posts under "keep reading". Its own endpoint, so a post page never loads the whole index. */
export async function getRelatedPosts(slug: string): Promise<BlogPostSummary[]> {
  const result = await read<{ data: BlogPostSummary[] }>(
    `/blog/${encodeURIComponent(slug)}/related`,
    { data: [] }
  );
  return result.data;
}

/**
 * Every published slug, for `generateStaticParams`.
 *
 * **Uncached, unlike everything else here.** This is the build's manifest of what to prerender, and
 * reading it through the 300s window means a build inherits whatever slug list the previous build
 * cached — locally that silently prerendered three posts out of eight. The five missing ones still
 * worked, because `dynamicParams` renders them on first request, but "worked" meant one visitor
 * paid for a cold render of a page the build could have had ready.
 *
 * It costs one request per build, and it is the one call here where being current matters more than
 * being cheap.
 */
export async function getPostSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/blog/slugs`, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[blog] /blog/slugs returned ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { data: string[] };
    return body.data;
  } catch (err) {
    // A build with no API reachable prerenders nothing and falls back to rendering on demand,
    // rather than failing the build outright.
    console.error("[blog] could not reach the API for the slug list", err);
    return [];
  }
}

/** `July 15, 2026`. Unchanged from the file-based version — the same posts must read the same way. */
export function formatPostDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
