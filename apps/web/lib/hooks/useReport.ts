"use client";
import { useQuery } from "@tanstack/react-query";
import { generateWeeklyReport, type WeeklyReport } from "@growthos/logic";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

function mockReport(): WeeklyReport {
  const weekStart = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  return generateWeeklyReport({
    weekStart,
    channels: [
      { channel: "google_ads", spend: 1365, revenue: 3010 },
      { channel: "meta_ads", spend: 2708, revenue: 2100 },
    ],
    topOpportunities: [
      { title: 'Create SEO content for "best office chair for back pain"', body: "Paid-proven, no organic coverage." },
      { title: 'Amplify "office chair" with a Meta campaign', body: "Proven organic demand to scale with paid." },
    ],
  });
}

export function useReport(workspaceId: string | null | undefined) {
  return useQuery<{ data: WeeklyReport; source: "live" | "mock" }>({
    queryKey: ["intelligence-report", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<WeeklyReport>(`/workspaces/${workspaceId}/intelligence/report`),
        mockReport
      ),
  });
}
