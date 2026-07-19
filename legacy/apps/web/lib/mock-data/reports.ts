export const revenueSourcesForMER = {
  totalRevenue: 48290,
  googleAdsSpend: 18450.75,
  metaAdsSpend: 18450.75,
};

export const recentReports = [
  { name: "Weekly Performance Report", type: "PDF", date: "May 12, 2026" },
  { name: "SEO Overview Report", type: "PDF", date: "May 12, 2026" },
  { name: "Google Ads Performance", type: "PDF", date: "May 11, 2026" },
  { name: "Meta Ads Report", type: "PDF", date: "May 11, 2026" },
];

// --- Sub-page mock data ---

export const customReportsList = [
  { name: "Executive Summary", metrics: ["Revenue", "Conversions", "ROAS"], schedule: "Monthly" },
  { name: "SEO Performance Deep Dive", metrics: ["Organic Traffic", "Keywords", "Backlinks"], schedule: "Weekly" },
];

export const scheduledReportsList = [
  { name: "Weekly Performance Report", recipients: 18, nextDelivery: "May 13, 2026 · 9:00 AM", active: true },
  { name: "Monthly Executive Summary", recipients: 4, nextDelivery: "Jun 1, 2026 · 9:00 AM", active: true },
  { name: "SEO Overview Report", recipients: 6, nextDelivery: "May 13, 2026 · 9:00 AM", active: false },
];

export const reportTemplatesList = [
  { name: "SEO Performance Report", desc: "Rankings, traffic, backlinks in one view" },
  { name: "Google Ads Report", desc: "Campaign performance, spend, ROAS" },
  { name: "Meta Ads Report", desc: "Campaign results, creative performance" },
  { name: "Analytics Overview", desc: "Traffic, behavior, conversions" },
  { name: "Executive Summary", desc: "High-level cross-channel summary" },
];
