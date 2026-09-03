/**
 * Tells the marketing site to rebuild its blog pages, right after a post changes.
 *
 * The public blog reads this API through Next's ISR cache with a 300s window, so a publish would
 * otherwise take up to five minutes to appear. That gap is not merely slow — an operator who
 * publishes, refreshes, and sees nothing concludes it failed and publishes again. This closes it.
 *
 * **Fire-and-forget, and never fatal.** If the web app is unreachable, mis-configured, or slow, the
 * publish still succeeded: the post is in the database and the ISR window will pick it up on its
 * own. Failing the write because a cache hint did not land would be trading a correct outcome for a
 * cosmetic one. Same reasoning as `logAdminAction` and `alertSuperAdmins`, which also swallow.
 *
 * Unconfigured is a normal state, not an error: with no WEB_APP_URL or REVALIDATE_SECRET this is a
 * no-op and the blog is simply eventually-consistent within the ISR window.
 */
export function revalidateBlog(slug?: string | null): void {
  const base = process.env.WEB_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!base || !secret) return

  const url = new URL('/api/revalidate', base)

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, slug: slug ?? null }),
    // Short: this is a hint, and a hung request must not hold an admin's save open.
    signal: AbortSignal.timeout(5_000),
  })
    .then((res) => {
      if (!res.ok) console.warn('[blog-revalidate] web app refused the hint', { status: res.status, slug })
    })
    .catch((err) => {
      console.warn('[blog-revalidate] could not reach the web app; the ISR window will catch up', {
        slug,
        err: err instanceof Error ? err.message : err,
      })
    })
}
