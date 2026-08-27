"use client";
import { useQuery } from "@tanstack/react-query";
import { generateWeeklyReport, type WeeklyReport } from "@growthos/logic";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

/** One week this workspace has a stored report for. Mirrors `ReportArchiveEntry` on the API. */
export interface ReportPeriod {
  weekStart: string;
  generatedAt: string;
}

/**
 * The offline stand-in, built through the real engine rather than hand-written JSON so the fallback
 * path exercises the same arithmetic the API does — including the organic remainder.
 *
 * The dates are the seed window's last week (see SEED_LAST_DAY in apps/api/src/seed-window.ts).
 * Anchoring them to `today` instead would claim the figures are current, which is the exact mistake
 * the report's `period` field exists to prevent.
 */
const MOCK_PERIOD = { from: "2026-07-11", to: "2026-07-17" };

/** The app-wide blended-revenue stand-in — REVENUE_FACTOR in apps/api/src/analytics.ts. */
const REVENUE_FACTOR = 2.2;

function withOrganic(
  channels: { channel: string; spend: number; revenue: number; conversions: number }[],
  clicks: number
) {
  const adRevenue = channels.reduce((s, c) => s + c.revenue, 0);
  return [
    ...channels,
    {
      channel: "organic",
      spend: 0,
      revenue: Math.round(adRevenue * (REVENUE_FACTOR - 1)),
      clicks,
      paid: false,
      modelled: true,
    },
  ];
}

function mockReport(): WeeklyReport {
  const weekStart = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  return generateWeeklyReport({
    weekStart,
    period: MOCK_PERIOD,
    channels: withOrganic(
      [
        { channel: "google_ads", spend: 1365, revenue: 3010, conversions: 44 },
        { channel: "meta_ads", spend: 2708, revenue: 2100, conversions: 28 },
      ],
      1204
    ),
    previousChannels: withOrganic(
      [
        { channel: "google_ads", spend: 1250, revenue: 2900, conversions: 41 },
        { channel: "meta_ads", spend: 2500, revenue: 2250, conversions: 30 },
      ],
      1132
    ),
    topOpportunities: [
      {
        title: 'Create SEO content for "best office chair for back pain"',
        body: "Paid-proven, no organic coverage.",
        type: "paid_to_organic",
        sourceChannel: "google_ads",
        targetChannel: "organic",
        priority: 87,
      },
      {
        title: 'Amplify "office chair" with a Meta campaign',
        body: "Proven organic demand to scale with paid.",
        type: "organic_to_paid",
        sourceChannel: "organic",
        targetChannel: "meta_ads",
        priority: 74,
      },
    ],
    openOpportunities: 11,
  });
}

/**
 * The current report, or one week out of the archive.
 *
 * `week` is the archived week's `weekStart`. A past week is served verbatim from storage rather
 * than recomputed, so it cannot rewrite itself against newer data — see the route in v1.ts.
 */
export function useReport(workspaceId: string | null | undefined, week?: string | null) {
  return useQuery<{ data: WeeklyReport; source: "live" | "mock" }>({
    queryKey: ["intelligence-report", workspaceId, week ?? "current"],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () =>
          api.get<WeeklyReport>(
            `/workspaces/${workspaceId}/intelligence/report${week ? `?week=${week}` : ""}`
          ),
        mockReport
      ),
  });
}

/**
 * Which weeks are in the archive, newest first.
 *
 * Falls back to an empty list rather than an invented history: with the API unreachable there is
 * genuinely nothing to step back to, and the week stepper hides itself instead of offering weeks
 * that cannot be loaded.
 */
export function useReportPeriods(workspaceId: string | null | undefined) {
  return useQuery<{ data: ReportPeriod[]; source: "live" | "mock" }>({
    queryKey: ["intelligence-report-periods", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ data: ReportPeriod[]; total: number }>(
              `/workspaces/${workspaceId}/intelligence/reports`
            )
          ).data,
        () => []
      ),
  });
}
