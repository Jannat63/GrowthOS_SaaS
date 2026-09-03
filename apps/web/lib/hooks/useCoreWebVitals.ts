"use client";
import { useQuery } from "@tanstack/react-query";
import type { CoreWebVitalsResponse } from "@growthos/types";
import { api } from "@/lib/api/client";

/**
 * Real Core Web Vitals for a single URL, via Google's PageSpeed Insights API
 * (apps/api/src/core-web-vitals.ts) — not seeded data. Disabled until a URL is supplied since
 * this hits a real external API on every distinct URL.
 */
export function useCoreWebVitals(
  workspaceId: string | null,
  url: string | null,
  strategy: "mobile" | "desktop" = "mobile"
) {
  return useQuery<CoreWebVitalsResponse>({
    queryKey: ["core-web-vitals", workspaceId, url, strategy],
    enabled: Boolean(workspaceId && url),
    queryFn: () =>
      api.get<CoreWebVitalsResponse>(
        `/workspaces/${workspaceId}/seo/core-web-vitals?url=${encodeURIComponent(url!)}&strategy=${strategy}`
      ),
    retry: false, // a bad/unreachable URL won't succeed on retry — surface the error instead
  });
}
