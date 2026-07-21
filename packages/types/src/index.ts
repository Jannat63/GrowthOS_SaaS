// Shared types across apps/api (Fastify) and apps/web (Next). JSON is camelCase across the boundary.

// ── Errors ───────────────────────────────────────────────────────────────────

export const ERROR_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  WORKSPACE_NOT_FOUND: 404,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  PLAN_LIMIT_REACHED: 402,
  INTEGRATION_NOT_CONNECTED: 409,
  RATE_LIMITED: 429,
  JOB_QUEUED: 202,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    statusCode: number;
  };
}

// ── Auth & tenancy ───────────────────────────────────────────────────────────

export type Role = "owner" | "admin" | "manager" | "viewer" | "client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

// Agency white-label branding for a workspace (M3 P3.5 Slice C). All fields optional —
// unset falls back to the default GrowthOS brand.
export interface WhiteLabelConfig {
  agencyName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null; // hex, e.g. "#4f46e5" — overrides the --primary token
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  onboardingComplete: boolean;
}

export interface Membership {
  workspaceId: string;
  role: Role;
  workspace: Workspace;
}

export interface MeResponse {
  user: AuthUser;
  memberships: Membership[];
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: Role;
}

export interface PlatformConnection {
  id: string;
  workspaceId: string;
  platform: string;
  accountName: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
}

// ── Pagination ───────────────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ── Recommendations (M2 P2.3a — backend-owned, persisted) ────────────────────

export type RecommendationStatus = "pending" | "acted" | "dismissed" | "snoozed";

export interface Recommendation {
  id: string;
  workspaceId: string;
  type: string;
  sourceChannel: string;
  targetChannel: string;
  title: string;
  body: string;
  actionLabel: string | null;
  impactScore: number;
  effortScore: number;
  urgencyScore: number;
  compositeScore: number;
  status: RecommendationStatus;
  assignedTo: string | null; // → user.id; null = unassigned (M3 P3.5)
  dueDate: string | null; // ISO date; null = no due date (M3 P3.5)
}

// SEO rank tracking (M3 P3.1, GSC-fed). Per-keyword position over time.
export interface KeywordRankingPoint {
  date: string;
  position: number;
}
export interface KeywordRanking {
  keyword: string;
  position: number; // latest
  previousPosition: number; // ~7 days earlier
  change: number; // previousPosition - position (positive = moved up / improved)
  best: number; // best (lowest) position in the window
  series: KeywordRankingPoint[];
}
export interface SeoRankingsResponse {
  keywords: KeywordRanking[];
  summary: { tracked: number; avgPosition: number; topThree: number; improved: number };
}

// Organic traffic (GSC page dimension). CTR is a percentage (e.g. 4.2 = 4.2%).
export interface OrganicPage {
  pageUrl: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
}
export interface OrganicTrafficPoint {
  date: string;
  clicks: number;
  impressions: number;
}
export interface OrganicTrafficResponse {
  pages: OrganicPage[];
  trend: OrganicTrafficPoint[];
  summary: {
    pages: number;
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
  };
}

// An entry in a workspace's audit log (M3 P3.5).
export interface AuditLogEntry {
  id: string;
  workspaceId: string;
  actorId: string | null;
  actorName: string | null; // joined from user; null for system/oauth actions
  action: string; // e.g. "recommendation.status_changed"
  entityType: string; // e.g. "recommendation" | "connection"
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string; // ISO
}

// A comment on a recommendation's collaboration thread (M3 P3.5).
export interface RecommendationComment {
  id: string;
  recommendationId: string;
  authorId: string;
  authorName: string | null; // joined from user; null if the author row is gone
  body: string;
  createdAt: string; // ISO
}

// ── Jobs (async operations — M2 P2.1) ────────────────────────────────────────

export type JobStatus = "queued" | "processing" | "complete" | "failed";

// The JSON contract Fastify LPUSHes onto Redis and the Python worker consumes. Versioned.
export interface JobEnvelope {
  v: 1;
  jobId: string;
  workspaceId: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface EnqueueResponse {
  jobId: string;
  statusUrl: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  result?: unknown;
  error?: string;
}

// ── Onboarding (M2 P2.2) ─────────────────────────────────────────────────────

export interface StrategyChannel {
  channel: "seo" | "google_ads" | "meta_ads";
  allocationPct: number;
  rationale: string;
}

export interface StrategyPhase {
  phase: string;
  focus: string;
  milestones: string[];
}

export interface OnboardingStrategy {
  summary: string;
  channelMix: StrategyChannel[];
  ninetyDayPlan: StrategyPhase[];
}

export interface CrawlSummary {
  pagesCrawled: number;
  topKeywords: string[];
  issues: string[];
  seeded: boolean;
}

export interface OnboardingProfile {
  websiteUrl: string | null;
  businessCategory: string | null;
  monthlyAdBudget: number | null;
  onboardingStep: string;
  onboardingComplete: boolean;
}

export interface OnboardingStatusResponse {
  profile: OnboardingProfile;
  analysis: { crawlSummary: CrawlSummary; strategy: OnboardingStrategy } | null;
}

// ── Content pipeline (M2 P2.3b) ──────────────────────────────────────────────

export interface ContentBrief {
  recommendedH1: string;
  wordCount: number;
  headingStructure: string[];
  entities: string[];
  faqQuestions: string[];
  metaTitle: string;
  metaDescription: string;
  internalLinkTargets: string[];
  schemaType: string;
}

export interface ScoredSearchTerm {
  term: string;
  clicks: number;
  conversions: number;
  cost: number;
  organicPosition: number | null;
  conversionRate: number;
  recommendationType: string;
  message: string;
}

export interface ContentBriefRecord {
  id: string;
  workspaceId: string;
  recommendationId: string | null;
  keyword: string;
  status: string;
  brief: ContentBrief;
}

// Organic-to-Paid (M2 P2.4) — Meta creative briefs from top organic pages.
export interface CreativeBrief {
  hook: string;
  primaryText: string;
  headline: string;
  format: string;
  audience: string;
  callToAction: string;
}

export interface TopOrganicPage {
  keyword: string;
  volume: number;
  currentPosition: number | null;
  opportunityScore: number;
}

// Blended MER (M2 P2.6)
export interface MerTrendPoint {
  date: string;
  mer: number;
  spend: number;
  revenue: number;
}

export interface MerDashboard {
  trend: MerTrendPoint[];
  summary: { blendedMER: number; totalSpend: number; interpretation: string };
  channelBreakdown: { googleAdsSpend: number; metaAdsSpend: number };
  anomaly: { detected: boolean; changePercent: number };
}

// Creative Fatigue (M2 P2.5)
export interface ScoredCreative {
  name: string;
  frequency: number;
  ctrThisWeek: number;
  ctrLastWeek: number;
  ctrDeclinePercent: number;
  status: "fatigued" | "at-risk" | "healthy";
  message: string;
}

// ── Billing (M5 P5.1) ─────────────────────────────────────────────────────────

export type Plan = "starter" | "growth" | "scale";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface Subscription {
  plan: Plan;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
}

// Plan limits reference (blueprint DATA_MODELS.md). Enforcement (PLAN_LIMIT_REACHED, 402) lands
// in M5 P5.2 — this table is the shared source of truth both apps/api and apps/web read from.
export const PLAN_LIMITS = {
  starter: {
    workspaces: 1,
    trackedKeywords: 500,
    adSpendLimit: 10_000,
    recommendationsPerWeek: 5,
    aiCreativesPerMonth: 10,
    teamMembers: 1,
    geoTracking: false,
    whiteLabel: false,
    crossChannelAttribution: "mer_only",
    apiAccess: false,
  },
  growth: {
    workspaces: 5,
    trackedKeywords: 2_500,
    adSpendLimit: 50_000,
    recommendationsPerWeek: Infinity,
    aiCreativesPerMonth: 100,
    teamMembers: 5,
    geoTracking: true,
    whiteLabel: true,
    crossChannelAttribution: "full",
    apiAccess: false,
  },
  scale: {
    workspaces: Infinity,
    trackedKeywords: 10_000,
    adSpendLimit: Infinity,
    recommendationsPerWeek: Infinity,
    aiCreativesPerMonth: Infinity,
    teamMembers: Infinity,
    geoTracking: true,
    whiteLabel: true,
    crossChannelAttribution: "full_custom",
    apiAccess: true,
  },
} as const satisfies Record<Plan, Record<string, unknown>>;

// ── WebSocket events (stub — fleshed out in M2) ──────────────────────────────

export type WebSocketEvent =
  | { type: "job:complete"; jobId: string; workspaceId: string }
  | { type: "recommendation:new"; workspaceId: string; recommendationId: string }
  | { type: "meta:fatigue_alert"; workspaceId: string; adSetId: string }
  | { type: "analytics:mer_alert"; workspaceId: string };
