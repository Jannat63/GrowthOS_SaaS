"use client";
import { useMutation } from "@tanstack/react-query";
import type { AdCopyVariant, UGCDuration, UGCScript } from "@growthos/logic";
import { api } from "@/lib/api/client";

/**
 * Server-side creative generation (M4 · P4.2a-4).
 *
 * DELIBERATELY NOT `liveOrMock`, and that is the point of the slice rather than an oversight:
 *
 *  - `liveOrMock` is a *query* pattern. No mutation hook here uses it — `useCollaborationActions`,
 *    `useBrandingActions` and `useBrandGuidelinesActions` all call `api.*` directly.
 *  - A local fallback for a **quota-consuming** action means the quota is bypassed by pulling the
 *    network cable. Shipping an enforcement path with a documented bypass beside it is worse than
 *    not shipping one.
 *  - Falling back locally would keep the generators in the browser bundle, which is exactly what
 *    this slice removes.
 *
 * `liveOrMock`'s purpose — "the app renders with no backend" — is about reading the dashboard. An
 * action button that needs a server is allowed to fail with an error when there is no server.
 *
 * The `type` imports below are type-only, so no generator code is pulled into the bundle.
 */

export type GenerateCreativeRequest =
  | { kind: "ad-copy"; product: string; benefit: string; painPoint: string; count?: number }
  | { kind: "ugc-script"; product: string; duration?: UGCDuration }
  | { kind: "rsa"; keyword: string; audience?: string };

export interface GenerateCreativeResult {
  kind: "ad-copy" | "ugc-script" | "rsa";
  adCopy?: AdCopyVariant[];
  script?: UGCScript;
  headlines?: string[];
  descriptions?: string[];
  /** What the workspace's brand guidelines removed, and why. */
  dropped: { text: string; reason: string; detail: string }[];
  generated: number;
  /** Remaining monthly allowance; null when the plan is unlimited. */
  remaining: number | null;
}

export function useCreativeGeneration(workspaceId: string | null | undefined) {
  return useMutation<GenerateCreativeResult, Error, GenerateCreativeRequest>({
    mutationFn: (request) =>
      api.post<GenerateCreativeResult>(`/workspaces/${workspaceId}/creatives/generate`, request),
  });
}
