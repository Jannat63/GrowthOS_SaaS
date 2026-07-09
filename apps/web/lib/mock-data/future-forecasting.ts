export const forecastModels = [
  { model: "Traffic Forecast", accuracy: 87, method: "Time-series (ARIMA)" },
  { model: "Conversion Forecast", accuracy: 84, method: "Regression" },
  { model: "Revenue Forecast", accuracy: 81, method: "Ensemble" },
];

export const ffScenarios = [
  { name: "Best Case", sessions: "425,000", revenue: "$290,000", roas: "5.1x" },
  { name: "Most Likely", sessions: "395,000", revenue: "$255,000", roas: "4.6x" },
  { name: "Worst Case", sessions: "375,000", revenue: "$180,000", roas: "3.2x" },
];

export const growthProjections = [
  { metric: "Sessions", current: "95,420", projected90d: "128,560", change: "+34.7%" },
  { metric: "Conversions", current: "2,348", projected90d: "3,650", change: "+55.4%" },
  { metric: "Revenue", current: "$48,290", projected90d: "$78,450", change: "+62.4%" },
];

export const riskFactors = [
  { risk: "Algorithm Update", level: "Medium", desc: "Google core update could impact rankings" },
  { risk: "Market Competition", level: "High", desc: "New competitor entered the office chair category" },
  { risk: "Budget Fluctuation", level: "Medium", desc: "Ad costs trending up 8% month-over-month" },
  { risk: "Seasonality Impact", level: "Low", desc: "Q2 is historically stable for this category" },
];
