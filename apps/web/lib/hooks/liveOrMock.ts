import { ApiError } from "@/lib/api/client";

/**
 * The dashboard's data-fetching contract: try the live API and, when the backend is *unreachable*,
 * fall back to a locally-computed mock so the UI still renders. Returns which source was used so a
 * DataSourceBadge can surface it. Kept pure (no React) so the fallback is unit-testable on its own.
 *
 * WHAT CHANGED, AND WHY IT MATTERS
 *
 * This used to catch everything. A 403, a 402, an expired session, a validation error — all of them
 * produced invented business numbers rendered as though real, distinguished only by a small badge.
 * Someone setting a budget could be reading fiction, and the product had no way to tell them their
 * plan limit had been reached or their session had expired, because those responses were swallowed
 * and replaced with fixtures.
 *
 * A 4xx is the server saying "I understood you and I am refusing". Answering that with made-up data
 * is the worst response available: it is wrong, it looks right, and it hides the one piece of
 * information the user needed. So 4xx now propagates and the UI reports it.
 *
 * The original intent — the app renders when there is no backend — is preserved exactly, because
 * that case is a network failure or a 5xx, not a 4xx.
 */
export async function liveOrMock<T>(
  fetcher: () => Promise<T>,
  mock: () => T
): Promise<{ data: T; source: "live" | "mock" }> {
  try {
    return { data: await fetcher(), source: "live" };
  } catch (err) {
    if (err instanceof ApiError && err.isClientError) throw err;
    return { data: mock(), source: "mock" };
  }
}
