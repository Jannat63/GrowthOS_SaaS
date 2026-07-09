export const growthHubStats = {
  growthScore: { value: 91, change: "+8" },
  totalRevenue: { value: "$48,290", change: "+18.6%" },
  totalTraffic: { value: "238,000", change: "+16.3%" },
  totalConversions: { value: "6,142", change: "+24.5%" },
  blendedMER: { value: "4.32x", change: "+15.2%" },
};

export const channelPerformance = [
  { channel: "SEO", metric1: { label: "Traffic", value: "128K", change: "+15.6%" }, metric2: { label: "Keywords Up", value: "512", change: "+18.2%" } },
  { channel: "Google Ads", metric1: { label: "Clicks", value: "24.6K", change: "+17.8%" }, metric2: { label: "Conversions", value: "1,842", change: "+19.3%" } },
  { channel: "Meta Ads", metric1: { label: "Clicks", value: "31.2K", change: "+14.2%" }, metric2: { label: "Conversions", value: "2,116", change: "+16.7%" } },
];

export const topOpportunity = {
  channel: "Google Ads",
  title: 'Run Google Ads for "office chair"',
  description: "This keyword is ranking #6 organically with high commercial intent.",
  potentialTraffic: "+4,300/mo",
  potentialRevenue: "+$4,200",
  confidence: "95%",
  impact: "High",
  effort: "Low",
};

export const tasks = [
  { label: "Publish blog: Best Office Chair 2026", due: "Due Today", done: true },
  { label: "Optimize 8 pages for target keywords", due: "Due Today", done: true },
  { label: "Review Google Ads search terms", due: "Due Tomorrow", done: true },
  { label: "Refresh Meta ad creative — Collection 1", due: "Due Tomorrow", done: true },
  { label: "Fix mobile usability issues", due: "Due in 2 days", done: true },
  { label: "Update product schema markup", due: "Due in 3 days", done: false },
];

// --- Intelligence Center sub-page mock data ---

export const predictiveAnalytics = [
  { channel: "SEO", predictedTraffic: 82600, actualTraffic: 69700, confidence: 89 },
  { channel: "Google Ads", predictedConversions: 2450, actualConversions: 2028, confidence: 84 },
  { channel: "Meta Ads", predictedROAS: 4.12, actualROAS: 3.37, confidence: 81 },
];

export const aiRecommendationsList = [
  { title: "Optimize 12 pages for better rankings", desc: "Target keywords with high potential", impact: "High" },
  { title: "Increase Google Ads budget by 18%", desc: "For \"Ergonomic Chair\" campaign", impact: "High" },
  { title: "Test 3 new ad creatives for Meta Ads", desc: "Based on audience behavior patterns", impact: "Medium" },
  { title: "Create content for 8 keyword gaps", desc: "Potential traffic: 5,340/month", impact: "Medium" },
  { title: "Build 15 high-quality backlinks", desc: "To improve domain authority", impact: "Low" },
];

export const anomalies = [
  { issue: "Sudden drop in rankings", detail: "/dining-table lost 12 positions", detected: "2h ago", severity: "Critical" },
  { issue: "Traffic drop detected", detail: "15% decrease in organic traffic", detected: "5h ago", severity: "Warning" },
  { issue: "High CPC spike", detail: '"office chair" CPC increased by 32%', detected: "7h ago", severity: "Warning" },
  { issue: "Conversion rate change", detail: "Google Ads conversion rate dropped", detected: "1d ago", severity: "Notice" },
];

export const contentIntelligence = {
  score: 78,
  topTopics: [
    { topic: "Ergonomic Chairs", performance: 92 },
    { topic: "Office Setup", performance: 88 },
    { topic: "Home Office", performance: 76 },
    { topic: "Living Room", performance: 72 },
  ],
};

export const marketInsights = [
  { trend: "Sustainable Furniture", growth: "+142%", related: ["Eco-friendly Chairs", "Bamboo Furniture", "Sustainable Office"] },
];

export const aiReportsList = [
  { title: "Weekly Growth Intelligence Report", date: "May 12, 2026", summary: "Organic traffic up 22.1%, Meta ROAS improved 24%" },
  { title: "Weekly Growth Intelligence Report", date: "May 5, 2026", summary: "Google Ads CPC rose 8%, offset by higher conversion rate" },
  { title: "Weekly Growth Intelligence Report", date: "April 28, 2026", summary: "New content cluster drove 12% traffic increase" },
];
