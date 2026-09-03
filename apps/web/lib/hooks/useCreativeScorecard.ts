"use client";
import { useQuery } from "@tanstack/react-query";
import { scoreCreatives, type ScorecardResult } from "@growthos/logic";
import { creatives } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

// Creative scorecard (M4 · P4.2a-2). A read, so it keeps the liveOrMock fallback — unlike creative
// GENERATION (P4.2a-4), which is a quota-consuming action and deliberately has none.
//
// The offline fallback runs the same engine over the same fixtures the API seeds from, so the
// grades are computed rather than invented. `DataSourceBadge` still reports this as `offline`, and
// as `sample` whenever Meta is not connected — a band reads as a judgement, so labelling its
// provenance matters more here than on a plain number.
function mockScorecard(): ScorecardResult {
  return scoreCreatives(creatives);
}

export function useCreativeScorecard(workspaceId: string | null | undefined) {
  return useQuery<{ data: ScorecardResult; source: "live" | "mock" }>({
    queryKey: ["creative-scorecard", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<ScorecardResult>(`/workspaces/${workspaceId}/meta-ads/scorecard`),
        mockScorecard
      ),
  });
}
