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

export interface PlatformConnection {
  id: string;
  workspaceId: string;
  platform: string;
  accountName: string | null;
  isActive: boolean;
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

// ── WebSocket events (stub — fleshed out in M2) ──────────────────────────────

export type WebSocketEvent =
  | { type: "job:complete"; jobId: string; workspaceId: string }
  | { type: "recommendation:new"; workspaceId: string; recommendationId: string }
  | { type: "meta:fatigue_alert"; workspaceId: string; adSetId: string }
  | { type: "analytics:mer_alert"; workspaceId: string };
