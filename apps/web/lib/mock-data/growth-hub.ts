import type { ChannelKey } from "@/components/dashboard/channels";

/** Blended-MER inputs (revenue / Google + Meta spend) — fed to the blended-mer engine. */
export const merInput = {
  totalRevenue: 48290,
  googleAdsSpend: 6200,
  metaAdsSpend: 4980,
};

/** Headline KPIs for the Growth Hub (mock until M2 analytics endpoints ship). */
export const kpiMock: { label: string; value: string; deltaPct: number }[] = [
  { label: "Total revenue", value: "$48,290", deltaPct: 18.6 },
  { label: "Ad spend", value: "$11,180", deltaPct: 6.2 },
  { label: "Organic clicks", value: "128K", deltaPct: 15.6 },
  { label: "Conversions", value: "6,142", deltaPct: 24.5 },
];

/** One live-feeling headline metric per channel node on the loop masthead. */
export const channelMetricMock: Record<ChannelKey, string> = {
  seo: "+18% organic clicks",
  google: "1,842 conversions",
  meta: "2,116 conversions",
};
