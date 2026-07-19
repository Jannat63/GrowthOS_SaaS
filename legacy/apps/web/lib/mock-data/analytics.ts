export const analyticsStats = {
  users: { value: "78,350", change: "+18.6%" },
  sessions: { value: "95,420", change: "+16.2%" },
  pageViews: { value: "215,680", change: "+20.7%" },
  bounceRate: { value: "42.35%", change: "-6.8%" },
};

export const trafficByChannel = [
  { channel: "Organic Search", users: 42680, pct: 54.5 },
  { channel: "Direct", users: 15230, pct: 19.4 },
  { channel: "Referral", users: 8945, pct: 11.4 },
  { channel: "Social", users: 6780, pct: 8.6 },
  { channel: "Paid Search", users: 3250, pct: 4.1 },
  { channel: "Email", users: 1465, pct: 1.9 },
];

export const sessionsTrend = [
  { day: "May 6", sessions: 12100 }, { day: "May 7", sessions: 12800 },
  { day: "May 8", sessions: 13400 }, { day: "May 9", sessions: 13100 },
  { day: "May 10", sessions: 14500 }, { day: "May 11", sessions: 14900 },
  { day: "May 12", sessions: 15600 },
];

// --- Sub-page mock data ---

export const trafficAnalyticsDetail = {
  landingPages: [
    { page: "/", sessions: 12450, change: "+18.6%" },
    { page: "/office-chairs", sessions: 8680, change: "+22.3%" },
    { page: "/dining-tables", sessions: 6240, change: "+15.9%" },
  ],
  devices: [
    { device: "Desktop", pct: 50.3 },
    { device: "Mobile", pct: 41.9 },
    { device: "Tablet", pct: 7.8 },
  ],
};

export const behaviorAnalytics = {
  avgSessionDuration: "02:48",
  pagesPerSession: 2.4,
  topEvents: [
    { event: "page_view", count: 215680 },
    { event: "scroll", count: 98420 },
    { event: "click", count: 32670 },
    { event: "form_submit", count: 6240 },
  ],
};

export const conversionsDetail = [
  { funnel: "Homepage → Product → Cart → Purchase", rate: 2.46, sessions: 95420 },
  { funnel: "Blog → Product → Purchase", rate: 1.82, sessions: 18200 },
  { funnel: "Search → Product → Purchase", rate: 3.14, sessions: 42680 },
];

export const eventsDetail = [
  { name: "page_view", count: 215680, change: "+20.7%" },
  { name: "scroll", count: 98420, change: "+18.5%" },
  { name: "click", count: 32670, change: "+16.3%" },
  { name: "form_submit", count: 6240, change: "+24.1%" },
  { name: "purchase", count: 2348, change: "+21.6%" },
];

export const attributionModel = [
  { channel: "Organic Search", firstTouch: 42, lastTouch: 28, dataDriver: 35 },
  { channel: "Google Ads", firstTouch: 18, lastTouch: 32, dataDriver: 26 },
  { channel: "Meta Ads", firstTouch: 28, lastTouch: 22, dataDriver: 25 },
  { channel: "Direct", firstTouch: 12, lastTouch: 18, dataDriver: 14 },
];
