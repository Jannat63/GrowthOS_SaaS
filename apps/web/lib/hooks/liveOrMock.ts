/**
 * The dashboard's data-fetching contract: try the live API, and on ANY failure
 * fall back to a locally-computed mock so the UI always renders. Returns which
 * source was used so a DataSourceBadge can surface it. Kept pure (no React) so
 * the fallback behavior is unit-testable on its own.
 */
export async function liveOrMock<T>(
  fetcher: () => Promise<T>,
  mock: () => T
): Promise<{ data: T; source: "live" | "mock" }> {
  try {
    return { data: await fetcher(), source: "live" };
  } catch {
    return { data: mock(), source: "mock" };
  }
}
