export const growthStrategyGoals = [
  { name: "Grow Revenue", desc: "Increase total revenue by 30% this quarter", progress: 72 },
  { name: "Acquire Users", desc: "Add 50K new users this quarter", progress: 64 },
  { name: "Improve Conversions", desc: "Increase conversion rate to 3%", progress: 58 },
  { name: "Enhance Retention", desc: "Improve user retention by 15%", progress: 46 },
];

export const forecastingSummary = {
  next30Days: { sessions: 128560, revenue: 78450 },
  confidence: 87,
};

export const scenarios = [
  { name: "Best Case", sessions: 425000, revenue: 290000, roas: "5.1x" },
  { name: "Most Likely", sessions: 395000, revenue: 255000, roas: "4.6x" },
  { name: "Worst Case", sessions: 375000, revenue: 180000, roas: "3.2x" },
];

export const resourceAllocation = [
  { channel: "SEO", team: "2 people", budget: "$4,000/mo", roi: "5.2x" },
  { channel: "Google Ads", team: "1 person", budget: "$18,000/mo", roi: "4.3x" },
  { channel: "Meta Ads", team: "1 person", budget: "$18,000/mo", roi: "4.3x" },
];

export const okrs = [
  { objective: "Become the #1 organic result for core keywords", keyResults: ["Rank top 3 for 20 keywords", "Increase organic traffic 25%"], progress: 68 },
  { objective: "Scale profitable paid acquisition", keyResults: ["Maintain ROAS above 4x", "Reduce CAC by 10%"], progress: 74 },
];

export const alertsSignals = [
  { signal: "Organic traffic up 22.1%", type: "Growth", time: "10m ago" },
  { signal: "Google Ads CPC increased by 12%", type: "Warning", time: "1h ago" },
  { signal: "Bounce rate increased by 6.8%", type: "Warning", time: "3h ago" },
];
