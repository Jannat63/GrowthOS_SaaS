"use client";
import { useQuery } from "@tanstack/react-query";
import type { Recommendation } from "@growthos/types";
import {
  generateCrossChannelRecommendations,
  scoreKeywords,
  analyzeSearchTerms,
  detectFatigueAll,
  analyzeCampaigns,
  toRecommendation,
  paidToOrganicRecommendation,
  organicToPaidRecommendation,
  fatigueAlertRecommendation,
  type MappedRecommendation,
} from "@growthos/logic";
import {
  rawKeywords,
  searchTerms,
  creatives,
  adCampaigns,
  metaCampaigns,
} from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

/**
 * The offline queue.
 *
 * This used to run only `generateCrossChannelRecommendations`, while the API runs four generators
 * (cross_channel, paid_to_organic, organic_to_paid, fatigue_alert). The fallback was therefore a
 * different queue from the live one — missing every content brief, creative brief and fatigue
 * alert, which are the three types that carry an `actionLabel`. Running all four here keeps the
 * promise the fallback exists to make: the same shape and the same content, computed locally.
 *
 * The filters mirror the API's generators exactly — see apps/api/src/{search-terms,organic-to-paid,
 * fatigue}.ts. Where they read a workspace's stored rows, this reads the same fixtures those rows
 * are seeded from.
 */
function generateAll(workspaceId: string): MappedRecommendation[] {
  const terms = analyzeSearchTerms(searchTerms);
  const keywords = scoreKeywords(rawKeywords);
  const fatigue = detectFatigueAll(creatives);

  return [
    ...generateCrossChannelRecommendations({
      keywords,
      searchTerms: terms,
      creatives: fatigue,
      googleCampaigns: analyzeCampaigns(adCampaigns),
      metaCampaigns: analyzeCampaigns(metaCampaigns),
    }).map((r) => toRecommendation(r, workspaceId)),

    ...terms
      .filter((t) => t.recommendation.type === "paid-proven-organic-needed")
      .map((t) => paidToOrganicRecommendation(t, workspaceId)),

    // Ranking top-10 with meaningful demand — organic-to-paid.ts:8.
    ...keywords
      .filter((k) => k.currentPosition !== null && k.currentPosition <= 10 && k.volume >= 5000)
      .map((k) => organicToPaidRecommendation(k, workspaceId)),

    ...fatigue
      .filter((f) => f.status !== "healthy")
      .map((f) => fatigueAlertRecommendation(f, workspaceId)),
  ];
}

/**
 * Drop cross-channel rows a specialised generator already covers.
 *
 * Mirrors `dedupeAgainstSpecialisedRows` in apps/api/src/recommendations.ts. Both the cross-channel
 * engine and the paid-to-organic generator read the same analysed search terms and emit the
 * identical title, so without this the offline queue lists three jobs twice — exactly the bug the
 * API-side dedupe fixes. The specialised row wins there and must win here too, or the two paths
 * disagree about which copy survives.
 */
function dedupe(recs: MappedRecommendation[]): MappedRecommendation[] {
  const specialised = new Set(
    recs.filter((r) => r.type !== "cross_channel").map((r) => r.title)
  );
  return recs.filter((r) => r.type !== "cross_channel" || !specialised.has(r.title));
}

/**
 * The offline queue, built exactly as the page will see it. Exported because its two invariants —
 * no duplicate titles, and the same deterministic order the API uses — are the whole point of the
 * dedupe and the three-key sort, and both are silent when they break.
 */
export function buildOfflineQueue(workspaceId: string): Recommendation[] {
  return dedupe(generateAll(workspaceId))
    .map(
      (m) =>
        ({
          id: m.externalId,
          workspaceId: m.workspaceId,
          type: m.type,
          sourceChannel: m.sourceChannel,
          targetChannel: m.targetChannel,
          title: m.title,
          body: m.body,
          actionLabel: m.actionLabel,
          impactScore: m.impactScore,
          effortScore: m.effortScore,
          urgencyScore: m.urgencyScore,
          compositeScore: m.compositeScore,
          status: m.status,
          assignedTo: null,
          dueDate: null,
          snoozedUntil: null,
          actedAt: null,
          createdAt: null,
          commentCount: 0,
        }) satisfies Recommendation
    )
    // Same three-key order the API uses (recommendations.ts `readOrdered`): composite descending,
    // then cheapest first, then id — because composite alone is a near-tie across this data.
    .sort(
      (a, b) =>
        b.compositeScore - a.compositeScore ||
        a.effortScore - b.effortScore ||
        a.id.localeCompare(b.id)
    );
}

/**
 * Cross-channel recommendation queue — backend-owned (M2 P2.3a). Fetches the persisted, generated
 * recommendations; on failure falls back to the same engines over the same fixtures.
 */
export function useRecommendations(workspaceId: string | null | undefined) {
  return useQuery<{ data: Recommendation[]; source: "live" | "mock"; total: number }>({
    queryKey: ["recommendations", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      // `total` is the queue's real size, which can exceed the page the API returns (limit caps at
      // 100). The counts on the filter chips are drawn from what was fetched, so the page needs to
      // know when that is a partial view rather than quietly reporting the page as the whole queue.
      const r = await liveOrMock(
        () =>
          api.get<{ data: Recommendation[]; total: number }>(
            `/workspaces/${workspaceId}/recommendations`
          ),
        () => {
          const data = buildOfflineQueue(workspaceId as string);
          return { data, total: data.length };
        }
      );
      return { data: r.data.data, total: r.data.total, source: r.source };
    },
  });
}
