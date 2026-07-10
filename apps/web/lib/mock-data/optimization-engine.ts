export const optimizationRecommendations = [
  { title: "Increase budget for top-performing campaigns", desc: "Reallocate 18% more budget to high ROAS campaigns", impact: "High" },
  { title: "A/B test product page layout", desc: "Test new layout to improve engagement & conversions", impact: "Medium" },
  { title: "Optimize for mobile users", desc: "Mobile conversion rate can be improved by 22%", impact: "Medium" },
  { title: "Implement dynamic ad creative", desc: "Use DCO to personalize ads at scale", impact: "Low" },
];

export const abTestsList = [
  { name: "Landing Page Headline", channel: "Website", variant: "B", status: "Running", expectedImpact: "+12.5% Conversions" },
  { name: "Google Ads CTA Button", channel: "Google Ads", variant: "A", status: "Running", expectedImpact: "+8.3% CTR" },
  { name: "Meta Ads Creative", channel: "Meta Ads", variant: "B", status: "Running", expectedImpact: "+15.7% ROAS" },
  { name: "Pricing Page Layout", channel: "Website", variant: "B", status: "Running", expectedImpact: "+10.2% Sign-ups" },
];

export const automationsList = [
  { name: "Budget Optimization", type: "Automated bid adjustment", active: true, actionsThisWeek: 8 },
  { name: "Bid Optimization", type: "Smart bidding tuning", active: true, actionsThisWeek: 7 },
  { name: "Rule-based Actions", type: "Pause underperforming ads", active: true, actionsThisWeek: 6 },
  { name: "Content Optimization", type: "Auto-refresh stale content", active: true, actionsThisWeek: 4 },
];

export const performanceBoosters = [
  { title: "Refresh 3 fatigued Meta creatives", impact: "Medium", eta: "1 day" },
  { title: "Fix 23 technical SEO issues", impact: "High", eta: "3 days" },
  { title: "Reduce Google Ads wasted spend", impact: "High", eta: "Immediate" },
];
