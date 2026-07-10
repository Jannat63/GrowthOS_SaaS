import { KeywordInput } from "@/lib/logic/seo-scoring";

export const seoStats = {
  organicTraffic: { value: "238,000", change: "+16.3%" },
  organicKeywords: { value: "12,450", change: "+18.6%" },
  keywordsInTop3: { value: "1,320", change: "+21.2%" },
  backlinks: { value: "45,230", change: "+12.8%" },
  domainRating: { value: "62", change: "+3" },
};

export const rawKeywords: KeywordInput[] = [
  { keyword: "office chair", volume: 18000, difficulty: 62, currentPosition: 6, competitorGapCount: 3, paidProvenConversions: 42, geoCitationPotential: 40 },
  { keyword: "ergonomic chair", volume: 9500, difficulty: 55, currentPosition: 9, competitorGapCount: 4, paidProvenConversions: 31, geoCitationPotential: 55 },
  { keyword: "best office chair 2026", volume: 4200, difficulty: 38, currentPosition: null, competitorGapCount: 7, paidProvenConversions: 18, geoCitationPotential: 70 },
  { keyword: "mesh office chair", volume: 3100, difficulty: 44, currentPosition: 14, competitorGapCount: 5, paidProvenConversions: 9, geoCitationPotential: 35 },
  { keyword: "gaming chair", volume: 22000, difficulty: 78, currentPosition: 21, competitorGapCount: 2, paidProvenConversions: 5, geoCitationPotential: 20 },
  { keyword: "modern dining table", volume: 6800, difficulty: 41, currentPosition: null, competitorGapCount: 8, paidProvenConversions: 0, geoCitationPotential: 60 },
  { keyword: "sofa collection", volume: 5100, difficulty: 33, currentPosition: 3, competitorGapCount: 1, paidProvenConversions: 12, geoCitationPotential: 25 },
];

// --- Sub-page mock data ---

export const rankTrackerKeywords = [
  { keyword: "office chair", position: 6, change: 2, volume: 18000, url: "/office-chairs", serpFeature: "AI Overview" },
  { keyword: "ergonomic chair", position: 9, change: -1, volume: 9500, url: "/ergonomic-chair", serpFeature: null },
  { keyword: "best office chair 2026", position: 14, change: 5, volume: 4200, url: "/blog/best-office-chair-2026", serpFeature: "Featured Snippet" },
  { keyword: "mesh office chair", position: 14, change: 0, volume: 3100, url: "/mesh-chairs", serpFeature: null },
  { keyword: "gaming chair", position: 21, change: -3, volume: 22000, url: "/gaming-chairs", serpFeature: null },
  { keyword: "sofa collection", position: 3, change: 1, volume: 5100, url: "/sofa-collection", serpFeature: "Image Pack" },
];

export const siteAuditIssues = {
  score: 87,
  critical: [
    { issue: "4xx errors detected", pages: 23, severity: "Critical" },
    { issue: "Missing canonical tags", pages: 8, severity: "Critical" },
  ],
  warnings: [
    { issue: "Missing meta descriptions", pages: 128, severity: "Warning" },
    { issue: "Slow page speed on mobile", pages: 45, severity: "Warning" },
    { issue: "Duplicate title tags", pages: 12, severity: "Warning" },
  ],
  notices: [
    { issue: "Large JavaScript files detected", pages: 67, severity: "Notice" },
    { issue: "Missing alt text on images", pages: 43, severity: "Notice" },
  ],
  passed: 1278,
};

export const contentBriefs = [
  { title: "Best Office Chair for Back Pain 2026", targetKeyword: "office chair for back pain", status: "In Progress", score: 72, wordTarget: 2200 },
  { title: "Ergonomic Chair Buying Guide", targetKeyword: "ergonomic chair guide", status: "Published", score: 91, wordTarget: 1800 },
  { title: "Modern Dining Table Ideas", targetKeyword: "modern dining table", status: "Draft", score: 34, wordTarget: 1500 },
  { title: "Mesh vs Fabric Office Chairs", targetKeyword: "mesh office chair", status: "Not Started", score: 0, wordTarget: 1600 },
];

export const coreWebVitals = {
  lcp: { value: 2.1, unit: "s", status: "Good" },
  inp: { value: 145, unit: "ms", status: "Good" },
  cls: { value: 0.08, unit: "", status: "Needs Improvement" },
};

export const backlinkProfile = {
  totalReferringDomains: 3420,
  totalBacklinks: 45230,
  domainRating: 62,
  newLinks30d: 214,
  lostLinks30d: 38,
  topReferringDomains: [
    { domain: "furnituretoday.com", authority: 78, links: 12, type: "Editorial" },
    { domain: "designmilk.com", authority: 71, links: 8, type: "Editorial" },
    { domain: "homeoffice-review.com", authority: 54, links: 15, type: "Guest Post" },
    { domain: "redditt.com/r/furniture", authority: 45, links: 32, type: "Forum" },
  ],
};

export const aiCitations = [
  { keyword: "best ergonomic office chair", platform: "ChatGPT", cited: true, lastChecked: "2h ago" },
  { keyword: "office chair for back pain", platform: "Perplexity", cited: true, lastChecked: "5h ago" },
  { keyword: "modern dining table ideas", platform: "Google AI Overview", cited: false, lastChecked: "1d ago" },
  { keyword: "gaming chair comparison", platform: "Gemini", cited: false, lastChecked: "1d ago" },
  { keyword: "mesh vs fabric chairs", platform: "ChatGPT", cited: true, lastChecked: "3h ago" },
];
