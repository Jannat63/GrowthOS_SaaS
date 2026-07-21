import { SearchTerm } from "@/lib/logic/search-terms-bridge";

export const googleAdsStats = {
  clicks: { value: "24,680", change: "+18.7%" },
  impressions: { value: "1.23M", change: "+14.3%" },
  cost: { value: "$18,450.75", change: "-6.4%" },
  conversions: { value: "1,842", change: "+22.1%" },
  costPerConv: { value: "$10.01", change: "-12.6%" },
};

export const searchTerms: SearchTerm[] = [
  { term: "best office chair for back pain", clicks: 412, conversions: 38, cost: 612.4, organicPosition: null },
  { term: "office chair", clicks: 890, conversions: 62, cost: 1240.1, organicPosition: 6 },
  { term: "ergonomic chair for home office", clicks: 210, conversions: 19, cost: 305.2, organicPosition: null },
  { term: "sofa collection", clicks: 340, conversions: 28, cost: 490.0, organicPosition: 3 },
  { term: "gaming chair rgb", clicks: 155, conversions: 4, cost: 210.6, organicPosition: 21 },
];

export const campaigns = [
  { name: "Search | Office Chairs", clicks: 8452, cost: 6240.25, conversions: 632, roas: "2.98x", status: "Enabled" },
  { name: "Search | Ergonomic Chairs", clicks: 6213, cost: 4125.4, conversions: 482, roas: "3.26x", status: "Enabled" },
  { name: "Shopping | All Products", clicks: 5781, cost: 3980.12, conversions: 376, roas: "2.74x", status: "Enabled" },
  { name: "Display | Remarketing", clicks: 2348, cost: 1204.45, conversions: 156, roas: "3.49x", status: "Enabled" },
];

// --- Sub-page mock data ---

export const adGroups = [
  { name: "Office Chairs - Exact", campaign: "Search | Office Chairs", clicks: 3200, cost: 2840.5, conversions: 245, status: "Enabled" },
  { name: "Office Chairs - Phrase", campaign: "Search | Office Chairs", clicks: 2100, cost: 1650.2, conversions: 178, status: "Enabled" },
  { name: "Ergonomic - Exact", campaign: "Search | Ergonomic Chairs", clicks: 1800, cost: 1420.8, conversions: 156, status: "Enabled" },
  { name: "Ergonomic - Broad", campaign: "Search | Ergonomic Chairs", clicks: 950, cost: 780.3, conversions: 62, status: "Paused" },
];

export const keywordsList = [
  { keyword: "office chair", matchType: "Exact", clicks: 2145, cost: 1890.4, conversions: 218, costPerConv: 8.67 },
  { keyword: "ergonomic chair", matchType: "Phrase", clicks: 1560, cost: 1240.1, conversions: 184, costPerConv: 6.74 },
  { keyword: "best office chair", matchType: "Exact", clicks: 980, cost: 890.2, conversions: 162, costPerConv: 5.49 },
  { keyword: "mesh office chair", matchType: "Phrase", clicks: 620, cost: 480.5, conversions: 131, costPerConv: 3.67 },
  { keyword: "gaming chair", matchType: "Exact", clicks: 1100, cost: 1250.8, conversions: 128, costPerConv: 9.77 },
];

export const adCreatives = [
  { headline: "Premium Office Chairs — Free Shipping", type: "RSA", ctr: 8.6, adStrength: "Excellent" },
  { headline: "Ergonomic Chairs Built for 8-Hour Days", type: "RSA", ctr: 7.2, adStrength: "Good" },
  { headline: "Shop Office Chairs — 30-Day Trial", type: "RSA", ctr: 6.4, adStrength: "Average" },
];

export const placementsList = [
  { placement: "Google Search", clicks: 18420, cost: 14200.5, conversions: 1420 },
  { placement: "Google Display Network", clicks: 3200, cost: 1850.2, conversions: 142 },
  { placement: "YouTube", clicks: 1980, cost: 1420.8, conversions: 68 },
  { placement: "Gmail", clicks: 1080, cost: 980.05, conversions: 42 },
];

export const audienceInsights = [
  { segment: "In-Market: Office Furniture", size: "1.2M", affinity: "High", conversions: 412 },
  { segment: "Remarketing: Website Visitors", size: "48K", affinity: "Very High", conversions: 312 },
  { segment: "Life Event: Recently Moved", size: "680K", affinity: "Medium", conversions: 156 },
  { segment: "Custom Intent: Competitor Sites", size: "220K", affinity: "High", conversions: 98 },
];

export const bidBudget = {
  totalBudget: 30000,
  spent: 18450.75,
  remaining: 11549.25,
  strategy: "Maximize Conversions",
  targetCPA: 12.5,
  campaigns: [
    { name: "Search | Office Chairs", budget: 8000, spent: 6240.25, strategy: "Target ROAS" },
    { name: "Search | Ergonomic Chairs", budget: 6000, spent: 4125.4, strategy: "Target ROAS" },
    { name: "Shopping | All Products", budget: 5000, spent: 3980.12, strategy: "Maximize Conversions" },
  ],
};

export const conversionActions = [
  { action: "Purchase", count: 1104, value: 38200, source: "Website" },
  { action: "Add to Cart", count: 412, value: 0, source: "Website" },
  { action: "Form Submit", count: 198, value: 0, source: "Website" },
  { action: "Phone Call", count: 86, value: 8600, source: "Call Tracking" },
];
