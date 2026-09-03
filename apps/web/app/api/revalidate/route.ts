import { revalidatePath, revalidateTag } from "next/cache";
import { BLOG_CACHE_TAG } from "@/lib/blog";

/**
 * Rebuilds the blog pages when a post changes in the console.
 *
 * Without this, publishing waits out the 300s ISR window — and an operator who publishes, refreshes,
 * and sees nothing does not conclude "caching", they conclude it failed and publish again. Called
 * by the API (apps/api/src/blog-revalidate.ts) immediately after any write that changes what the
 * public sees.
 *
 * **The secret is compared in constant time and is the only authentication.** This endpoint can
 * force work on the server, so a timing-distinguishable comparison is worth closing even though the
 * worst outcome of an unauthorised call is a cache miss. With REVALIDATE_SECRET unset the route
 * refuses everything rather than defaulting to open — an unconfigured deployment falls back to the
 * ISR window, which is merely slower, whereas defaulting to open would be a permanent hole.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Revalidation is not configured on this deployment." },
      { status: 503 }
    );
  }

  let body: { secret?: unknown; slug?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (typeof body.secret !== "string" || !timingSafeEqual(body.secret, secret)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  // The tag covers every cached blog fetch — index, post, related, slugs — in one call, so a
  // change can never leave one of those four stale while the others update.
  revalidateTag(BLOG_CACHE_TAG);
  revalidatePath("/blog");
  if (typeof body.slug === "string" && body.slug !== "") {
    revalidatePath(`/blog/${body.slug}`);
  }
  // The sitemap lists every post, so a publish changes it too.
  revalidatePath("/sitemap.xml");

  return Response.json({ revalidated: true, slug: body.slug ?? null });
}

/** Compares every character regardless of where the first difference is. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
