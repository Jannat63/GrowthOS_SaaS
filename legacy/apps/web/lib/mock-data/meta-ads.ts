import { CreativePerformance } from "@/lib/logic/creative-fatigue";

export const metaAdsStats = {
  results: { value: "2,348", change: "+21.6%" },
  reach: { value: "512,680", change: "+18.7%" },
  amountSpent: { value: "$18,450.75", change: "-6.8%" },
  purchaseROAS: { value: "4.32x", change: "+24.1%" },
};

export const creatives: CreativePerformance[] = [
  { name: "Modern Chair — Offer Ad", frequency: 4.2, ctrThisWeek: 1.8, ctrLastWeek: 2.6, hoursSinceLaunch: 96 },
  { name: "Living Room Collection", frequency: 2.1, ctrThisWeek: 2.4, ctrLastWeek: 2.5, hoursSinceLaunch: 48 },
  { name: "Dining Set — Special", frequency: 3.6, ctrThisWeek: 1.9, ctrLastWeek: 2.3, hoursSinceLaunch: 80 },
  { name: "Bedroom Set — Sale", frequency: 1.4, ctrThisWeek: 3.1, ctrLastWeek: 3.0, hoursSinceLaunch: 30 },
];

// --- Sub-page mock data ---

export const metaCampaigns = [
  { name: "Summer Sale — Conversions", objective: "Website Purchases", results: 812, reach: 185432, cost: 6245.30, roas: "5.21x", status: "Active" },
  { name: "Remarketing — Visitors", objective: "Website Purchases", results: 542, reach: 124680, cost: 3452.18, roas: "4.12x", status: "Active" },
  { name: "Lookalike — 1% Purchasers", objective: "Website Purchases", results: 412, reach: 98765, cost: 2850.40, roas: "3.89x", status: "Active" },
  { name: "Lead Gen — Form Submit", objective: "Lead Form Submits", results: 376, reach: 76543, cost: 2165.22, roas: "2.11x", status: "Active" },
  { name: "Brand Awareness — Reach", objective: "Reach", results: 0, reach: 512680, cost: 1737.65, roas: "—", status: "Paused" },
];

export const metaAdSets = [
  { name: "Lookalike (1%) — Purchasers", campaign: "Summer Sale", results: 812, costPerResult: 6.12, budget: 5000 },
  { name: "Retargeting — Website Visitors", campaign: "Remarketing", results: 542, costPerResult: 6.37, budget: 3500 },
  { name: "Interest — Home Decor", campaign: "Lookalike 1%", results: 412, costPerResult: 7.28, budget: 3000 },
  { name: "Engaged Shoppers", campaign: "Lead Gen", results: 270, costPerResult: 7.84, budget: 2500 },
];

export const metaAdsList = [
  { name: "Modern Chair — Offer Ad", adSet: "Lookalike 1%", conversions: 512, roas: "5.62x", format: "Single Image" },
  { name: "Living Room Collection", adSet: "Retargeting", conversions: 458, roas: "4.98x", format: "Carousel" },
  { name: "Dining Set — Special", adSet: "Interest Home Decor", conversions: 312, roas: "4.21x", format: "Video" },
  { name: "Bedroom Set — Sale", adSet: "Engaged Shoppers", conversions: 286, roas: "3.89x", format: "Single Image" },
];

export const metaAudiences = [
  { name: "Website Visitors (30d)", size: "48,200", type: "Custom" },
  { name: "Lookalike 1% — Purchasers", size: "1.2M", type: "Lookalike" },
  { name: "Add to Cart — Not Purchased", size: "12,400", type: "Custom" },
  { name: "Engaged with Instagram (90d)", size: "86,500", type: "Engagement" },
];

export const metaPlacements = [
  { placement: "Facebook Feed", results: 1124, roas: "4.68x" },
  { placement: "Instagram Feed", results: 786, roas: "4.32x" },
  { placement: "Instagram Stories", results: 356, roas: "3.98x" },
  { placement: "Facebook Stories", results: 178, roas: "3.21x" },
  { placement: "Audience Network", results: 94, roas: "2.12x" },
];

export const metaCreativeLibrary = [
  { name: "Modern Chair — Offer Ad", format: "Single Image", conversions: 512, roas: "5.62x", fatigueStatus: "Healthy" },
  { name: "Living Room Collection", format: "Carousel", conversions: 458, roas: "4.98x", fatigueStatus: "At Risk" },
  { name: "Dining Set — Special", format: "Video", conversions: 312, roas: "4.21x", fatigueStatus: "Fatigued" },
  { name: "Bedroom Set — Sale", format: "Single Image", conversions: 286, roas: "3.89x", fatigueStatus: "Healthy" },
];

export const metaABTests = [
  { name: "Headline: Offer vs Feature", variantA: "Free Shipping Today", variantB: "Built for 8-Hour Comfort", winner: "B", lift: "+18.4%" },
  { name: "Creative: Photo vs Video", variantA: "Product Photo", variantB: "15s UGC Video", winner: "B", lift: "+27.6%" },
  { name: "CTA: Shop Now vs Learn More", variantA: "Shop Now", variantB: "Learn More", winner: "A", lift: "+9.2%" },
];

export const metaBudgetBidding = {
  totalBudget: 25000,
  spent: 18450.75,
  remaining: 6549.25,
  campaigns: [
    { name: "Summer Sale — Conversions", budget: 8000, spent: 6245.30 },
    { name: "Remarketing — Visitors", budget: 5000, spent: 3452.18 },
    { name: "Lookalike — 1% Purchasers", budget: 4000, spent: 2850.40 },
  ],
};

export const metaConversionTracking = {
  pixelStatus: "Active",
  capiStatus: "Active",
  eventMatchQuality: 7.8,
  events: [
    { name: "Purchase", count: 2348, source: "Pixel + CAPI" },
    { name: "Add to Cart", count: 4245, source: "Pixel + CAPI" },
    { name: "ViewContent", count: 28450, source: "Pixel" },
  ],
};
