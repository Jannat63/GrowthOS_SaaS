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
  // A real third-party service (e.g. Google PageSpeed Insights) was reachable but failed or
  // errored — distinct from INTERNAL_ERROR (our own bug) and INTEGRATION_NOT_CONNECTED (nothing
  // was even configured). 502 Bad Gateway: this server, acting as a gateway, got an invalid
  // response from the upstream server it was calling.
  UPSTREAM_ERROR: 502,
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
  /**
   * Platform-wide staff access, null for every customer. Exposed here because sign-in has to route
   * platform staff to the admin console rather than through workspace onboarding, and it had no
   * way to know: the role was set on the row and read by the API guards, but never surfaced to the
   * client. Set only by packages/db/scripts/grant-admin.ts — never through a form.
   */
  platformRole?: PlatformRole | null;
  /** Optional contact number, collected on the admin profile step. */
  phone?: string | null;
}

// Agency white-label branding for a workspace (M3 P3.5 Slice C). All fields optional —
// unset falls back to the default GrowthOS brand.
export interface WhiteLabelConfig {
  agencyName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null; // hex, e.g. "#4f46e5" — overrides the --primary token
}

// Autonomous intelligence loop config (per workspace). cadenceMs = how stale a report may get
// before the scheduler refreshes it and pushes report:ready.
export interface AutomationConfig {
  enabled: boolean;
  cadenceMs: number;
}

// Observability: one scheduler tick.
export interface SchedulerRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  refreshedCount: number;
  alertCount: number;
  errorCount: number;
  details: { refreshed?: string[]; errors?: { workspaceId: string; message: string }[] } | null;
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

// Team invitations (M5 follow-up — deferred from M2 P2.8, never delivered in M5). Rows live in
// `workspace_invitations` (Better Auth's org-plugin table, accessed directly via Drizzle rather
// than the plugin's own invitation API — see guards.ts for why app roles matter here).
// "expired" is never stored: `status` on the row is only ever "pending" | "accepted" | "revoked",
// and API responses report "expired" instead of "pending" once `expiresAt` has passed.
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: Role;
  status: InvitationStatus;
  inviterId: string;
  inviterName: string | null;
  createdAt: string; // ISO
  expiresAt: string; // ISO
}

// Unauthenticated preview for the accept-invite page — deliberately thin (no workspaceId,
// inviter identity, or member list) since anyone with the link can read it before signing in.
export interface InvitationPreview {
  id: string;
  email: string;
  role: Role;
  status: InvitationStatus;
  workspaceName: string;
  workspaceSlug: string;
}

export interface AcceptInvitationResponse {
  workspaceId: string;
  workspaceSlug: string;
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
  /**
   * When a snoozed recommendation returns to the queue. Null on a snooze with no end date.
   *
   * The column has existed since P2.3b and was never surfaced, which made Snooze inert: the row
   * kept its place in the open queue and only its badge changed. The queue reads this to hide a
   * snoozed row until its date passes, so the button now does what it says.
   */
  snoozedUntil: string | null; // ISO
  /** When someone marked this acted. Null until then. */
  actedAt: string | null; // ISO
  /** When the recommendation was generated — how long it has been waiting. */
  createdAt: string | null; // ISO
  /**
   * Comments on this recommendation, counted server-side.
   *
   * Carried on the row rather than fetched per card: the thread itself is still lazy, but the
   * count has to arrive with the list or the queue cannot show which items have a discussion
   * without opening all of them one at a time.
   */
  commentCount: number;
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

// Outbound webhooks (M4 P4.4a-2) — the push half of the public API, Scale tier.
//
// `secret` appears ONLY in the creation response. It is encrypted at rest and never returned by any
// read route, so a UI that loses it cannot recover it — the user must copy it at creation or rotate
// the endpoint. Same handling as an API key's plaintext.
export interface WebhookEndpoint {
  id: string;
  url: string;
  eventTypes: string[];
  enabled: boolean;
  consecutiveFailures: number;
  disabledAt: string | null; // ISO
  createdAt: string; // ISO
}

export interface CreatedWebhookEndpointResponse extends WebhookEndpoint {
  secret: string; // shown once, at creation, and never again
}

// Keyword clustering (M3 P3.1 slice). Topical groups over the tracked keyword set, produced by the
// `clusterKeywords` engine in @growthos/logic.
//
// `intentVerified` is false for every cluster today, and the UI must say so. These are LEXICAL
// clusters — grouped by shared words — and text similarity cannot see intent that only shows up in
// the search results ("how to clean running shoes" and "best running shoes" look alike and are not
// alike). Confirming intent needs SERP-overlap data, i.e. a paid DataForSEO key. The flag exists so
// that when that pass lands, verified and unverified clusters stay distinguishable rather than the
// UI quietly starting to overclaim.
export interface SeoClusterKeyword {
  keyword: string;
  position: number;
}
export interface SeoKeywordCluster {
  clusterName: string;
  intentVerified: boolean;
  keywords: SeoClusterKeyword[];
  avgPosition: number;
}
export interface SeoClustersResponse {
  clusters: SeoKeywordCluster[];
  // `singletons` counts clusters of exactly one keyword — the honest read on how much grouping
  // actually happened, which a bare cluster count hides.
  summary: { clusters: number; keywords: number; largestCluster: number; singletons: number };
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
  /**
   * The window these figures were actually measured over.
   *
   * Both queries behind this response ran with no date filter at all, summing every seeded day —
   * 180 of them — while the UI labelled the totals "Clicks (30d)". The live figures were six times
   * the window they claimed, and six times what the offline fallback produced for the same tiles.
   * The window now travels with the numbers so a label can never drift from them again.
   */
  period: { from: string; to: string } | null;
  summary: {
    pages: number;
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
  };
}

// Schema markup generator (SEO extras — works off page URL structure + workspace business info,
// no DataForSEO or content-crawling needed). `placeholders` lists the jsonLd keys the tool
// couldn't infer and left as a `[SET_...]` marker for the user to fill in by hand.
export type SchemaMarkupType =
  | "WebPage"
  | "Article"
  | "Product"
  | "CollectionPage"
  | "FAQPage"
  | "Organization";
export interface SchemaMarkupResponse {
  pageUrl: string;
  detectedType: SchemaMarkupType;
  availableTypes: SchemaMarkupType[];
  jsonLd: Record<string, unknown>;
  placeholders: string[];
}

// Internal link optimizer (SEO extras — works off already-tracked keyword rankings + organic
// pages, no crawled link graph needed). Flags keywords in the "striking distance" band
// (position 4-15) and suggests linking from a higher-authority page using the keyword as anchor
// text — the same heuristic real SEO tools use for this exact recommendation type.
export interface InternalLinkRecommendation {
  targetPage: string;
  sourcePage: string;
  keyword: string;
  anchorText: string;
  currentPosition: number;
  priority: "high" | "medium" | "low";
  reason: string;
}
export interface InternalLinkRecommendationsResponse {
  recommendations: InternalLinkRecommendation[];
  summary: { opportunities: number; highPriority: number };
}

// Site audit (SEO extras — M4, real feature). A genuine crawl over real HTTP, run as a background
// job (apps/worker's `site_audit` handler) since it can take a while against a real domain. No
// third-party API — this is GrowthOS's own crawler, restored from the pre-rebuild implementation.
export interface SiteAuditPageResult {
  url: string;
  statusCode: number | null;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  wordCount: number;
  hasCanonical: boolean;
  internalLinks: string[];
  issues: string[];
}
export interface SiteAuditResult {
  startUrl: string;
  pagesCrawled: number;
  totalIssues: number;
  healthyPages: number;
  pages: SiteAuditPageResult[];
}
export interface SiteAuditStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  result?: SiteAuditResult;
  error?: string;
}

// Core Web Vitals (SEO extras, real feature) — a direct, synchronous call to Google's PageSpeed
// Insights API (see apps/api/src/core-web-vitals.ts). Real field/lab data, not seeded.
export interface CoreWebVitalsResponse {
  url: string;
  strategy: "mobile" | "desktop";
  performanceScore: number | null;
  lcpMs: number | null;
  clsScore: number | null;
  inpMs: number | null;
  ttfbMs: number | null;
  fetchedAt: string;
}

// Keyword clustering (SEO extras, real feature) — a pure Jaccard-similarity algorithm
// (@growthos/logic's clusterKeywords) run over this workspace's already-tracked keywords. Real
// whenever the tracked keywords themselves are real (a live Search Console sync); same-shaped
// sample output otherwise, per the usual three-state provenance rule.
export interface KeywordClusterGroup {
  clusterName: string;
  keywords: string[];
}
export interface KeywordClustersResponse {
  clusters: KeywordClusterGroup[];
  totalKeywords: number;
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

/**
 * The editorial stages a brief moves through. The column and its default have existed since the
 * table was created; nothing ever wrote it after the insert and no screen ever showed it, so a
 * page called "Content Pipeline" had no pipeline in it.
 */
export type ContentBriefStatus = "draft" | "approved" | "in_progress" | "published";

export const CONTENT_BRIEF_STAGES: readonly ContentBriefStatus[] = [
  "draft",
  "approved",
  "in_progress",
  "published",
];

export interface ContentBriefRecord {
  id: string;
  workspaceId: string;
  recommendationId: string | null;
  keyword: string;
  status: ContentBriefStatus;
  /**
   * One jsonb column, two shapes: a ContentBrief for a paid->organic brief, a CreativeBrief for an
   * organic->paid one. Modelled as the union it actually is — the Creative Queue used to reach the
   * second through `as unknown as CreativeBrief`, which silenced the ambiguity instead of
   * resolving it. Narrow with isContentBrief / isCreativeBrief from @growthos/logic.
   */
  brief: ContentBrief | CreativeBrief;
  /** Which bridge produced it — google_ads_search_term | organic_top_page | meta_hook | manual. */
  source: string;
  /** Set when the article ships. This is what closes the loop back to the SEO module. */
  publishedUrl: string | null;
  createdAt: string | null; // ISO
}

// Organic-to-Paid (M2 P2.4) — Meta creative briefs from top organic pages.
/**
 * How the ad should open, decided by the organic position the keyword holds.
 *
 * `own` is top of page one (1-3), a position the site demonstrably holds, so the ad extends reach.
 * `claim` is page one below the fold (4-10), where the ad has to earn a click the ranking is not
 * winning on its own. Derived by `creativePlay()` in `@growthos/logic`, which is the only place
 * the thresholds are defined.
 */
export type CreativePlay = "own" | "claim";

export interface CreativeBrief {
  hook: string;
  primaryText: string;
  headline: string;
  format: string;
  audience: string;
  callToAction: string;
  /**
   * Which play this brief runs, and the evidence for it.
   *
   * Optional because `content_briefs.brief` is jsonb and holds rows written before plays existed.
   * Those rows still satisfy `isCreativeBrief` and must still render, so consumers treat these as
   * absent-able rather than assuming a backfill that has not run.
   */
  play?: CreativePlay;
  rationale?: string;
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

// Growth Hub headline metrics (M2 P2.6 follow-on).
//
// Every metric carries its own previous-window value rather than a pre-computed delta: the API
// stays presentational-decision-free (formatting and delta math live in the web hook, next to the
// engine calls), and a consumer that wants the raw pair can have it.
export interface GrowthHubMetric {
  current: number;
  previous: number;
}

/**
 * Daily values across the current window, oldest first — one array per headline metric, for the
 * tile sparklines. Returned alongside the aggregates rather than as a second endpoint because the
 * page needs both together and they come from the same two tables.
 *
 * Paid and organic series can differ in length: they are windowed against their own `max(date)`
 * (see growth-hub.ts), so a workspace whose GSC sync is a day behind its ad sync gets arrays of
 * different sizes. Sparklines don't care, and forcing them into step would mean inventing a day.
 */
export interface GrowthHubDaily {
  revenue: number[];
  adSpend: number[];
  conversions: number[];
  organicClicks: number[];
}

export interface GrowthHubResponse {
  /** Length of each comparison window, in days. Both windows are this long. */
  windowDays: number;
  /** The exact inclusive date range these figures cover — what the date picker displays. */
  window: { from: string; to: string };
  /** Earliest date this workspace has data for, or null when it has none. Bounds the picker. */
  dataFrom: string | null;
  metrics: {
    revenue: GrowthHubMetric;
    googleSpend: GrowthHubMetric;
    metaSpend: GrowthHubMetric;
    organicClicks: GrowthHubMetric;
    conversions: GrowthHubMetric;
  };
  /** Per-channel headline for the loop masthead. */
  daily: GrowthHubDaily;
  /**
   * The last date every surface on this dashboard has data for, `YYYY-MM-DD`, or null on a
   * workspace with no data at all.
   *
   * Deliberately the EARLIER of the paid and organic maxima, not the later. Past that point one
   * of the two pipelines has nothing, so a blended figure covering it would be understated
   * without saying so. Reporting the later date would make the dashboard claim freshness it
   * only has on one channel.
   */
  dataThrough: string | null;
  channels: {
    seo: { organicClicks: number };
    google: { conversions: number };
    meta: { conversions: number };
  };
  /**
   * Inputs for the Goal Simulator engine (`simulateGoal`). `currentConversionRate` uses clicks
   * (paid + organic) as the sessions proxy — GSC exposes no sessions metric, so this is the closest
   * real signal the pipeline carries. `currentAOV` is raw ad-reported conversion value per
   * conversion, deliberately NOT scaled by the blended-revenue factor: an order value is an order
   * value.
   */
  baseline: {
    currentConversionRate: number;
    currentAOV: number;
    /** The window's actual session count — the anchor a target is adjusted up or down from. */
    currentSessions: number;
  };
}

// Creative Fatigue (M2 P2.5)
export interface ScoredCreative {
  name: string;
  frequency: number;
  ctrThisWeek: number;
  ctrLastWeek: number;
  /**
   * Week-over-week CTR change as a DECLINE: positive means CTR fell, negative means it rose.
   *
   * The sign is the opposite of what a reader expects from a delta, which is why the monitor
   * rendered a recovering creative as "Δ -3%" — a number most people read as bad. Anything
   * rendering this must state the direction in words rather than printing it as a signed delta.
   */
  ctrDeclinePercent: number;
  /**
   * Hours the creative has been running. Gates the `at-risk` rule entirely (see
   * FATIGUE_THRESHOLDS.alertWindowHours) and was missing from this type, so the UI could not
   * explain why a creative over the frequency line was still unflagged.
   */
  hoursSinceLaunch: number;
  status: "fatigued" | "at-risk" | "healthy";
  message: string;
}

// ── Billing (M5 P5.1) ─────────────────────────────────────────────────────────

// Super Admin panel — platform-wide administration, entirely separate from workspace-scoped Role.
// See apps/api/src/admin.ts / docs/growthos-modular-packages-and-admin.md §3 for the design.
export type PlatformRole = "support_agent" | "super_admin";

export type Plan = "starter" | "growth" | "scale";

export interface AdminWorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  memberCount: number;
  connectedPlatformCount: number;
  createdAt: string;
  /** Null unless the workspace is on a trial. Drives the "ends in 2 days" warning in the list. */
  trialEndsAt: string | null;
  /**
   * The most recent entry in the workspace's own audit log — the closest thing to "is anyone
   * actually using this". Null for a workspace that has never done anything, which is itself the
   * answer to a question an operator asks.
   */
  lastActivityAt: string | null;
}

/** Directory filters. Each one is a question an operator has, not a column to sort by. */
export type AdminWorkspaceFilter =
  | "past_due"
  | "trial_ending"
  | "no_connections"
  | "cancelling";

export type AdminWorkspaceSort = "created" | "name" | "members" | "activity";

export type AdminUserFilter = "staff" | "no_workspace";

export type AdminUserSort = "created" | "name" | "last_seen";

/**
 * One person's file.
 *
 * `emailVerified` is deliberately absent. `apps/api/src/auth.ts` does not enable email
 * verification, so the column is false for every account on the platform and showing it would
 * read as a platform-wide fault rather than a fact about this person.
 */
export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  image: string | null;
  platformRole: PlatformRole | null;
  phone: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  memberships: {
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    role: Role;
  }[];
  /**
   * Live sessions only — expired ones are deleted, so this is "where they are signed in now", the
   * thing you want before deciding whether to sign someone out everywhere.
   */
  sessions: {
    id: string;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  }[];
}
export interface AdminWorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  createdAt: string;
  subscription: {
    plan: Plan;
    status: SubscriptionStatus;
    trialEndsAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAt: string | null;
  };
  members: { userId: string; name: string; email: string; role: string }[];
  connections: { platform: string; accountName: string | null; isActive: boolean | null; lastSyncedAt: string | null }[];
}
export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  platformRole: string | null;
  workspaceCount: number;
  createdAt: string;
  /**
   * Most recent activity on any live session. Sessions are deleted when they expire, so this goes
   * null for anyone who has not signed in lately — which is the useful reading, not a gap.
   */
  lastSeenAt: string | null;
}
/**
 * The admin overview.
 *
 * `attention` is the point of the page: the four things that need a person, each item carrying
 * enough to render one row and link straight to the account. Every list is capped server-side —
 * an operator works a queue, and a queue of two hundred is a report, not a queue. `*Total` says
 * how many there really are so the UI can say "and 40 more" honestly.
 *
 * Structured, not prose: the wording belongs to the interface (and channel slugs must render
 * through `channelLabel`, per CLAUDE.md), so the API sends facts and the client writes sentences.
 */
export interface PlatformOverview {
  totalWorkspaces: number;
  totalUsers: number;
  /**
   * Summed list price of subscriptions in `active`, in US cents. Trials are not revenue yet and
   * `past_due` is revenue that did not arrive, so neither counts — they appear in `attention`
   * instead, which is where they can actually be acted on.
   */
  mrrCents: number;
  signupsLast7d: number;
  workspacesByPlan: { plan: string; count: number }[];
  attention: {
    pastDue: PastDueItem[];
    pastDueTotal: number;
    trialsEnding: TrialEndingItem[];
    trialsEndingTotal: number;
    staleConnections: StaleConnectionItem[];
    staleConnectionsTotal: number;
    failedJobs: FailedJobItem[];
    failedJobsTotal: number;
  };
}

interface AttentionTarget {
  workspaceId: string;
  workspaceName: string;
}

export interface PastDueItem extends AttentionTarget {
  plan: string;
  /** When the subscription was last updated, which is when it went past due. */
  since: string | null;
}

export interface TrialEndingItem extends AttentionTarget {
  plan: string;
  /** May be in the past — a trial that has already lapsed is more urgent, not less. */
  trialEndsAt: string;
}

export interface StaleConnectionItem extends AttentionTarget {
  /** Storage slug (`google_ads` etc.) — render it through `channelLabel`, never raw. */
  platform: string;
  accountName: string | null;
  lastSyncedAt: string | null;
  isActive: boolean;
}

export interface FailedJobItem extends AttentionTarget {
  jobId: string;
  type: string;
  error: string | null;
  failedAt: string | null;
}
export interface AdminAuditLogEntry {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: unknown;
  createdAt: string;
}

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
//
// `apiRequestsPerMinute` (M4 P4.4a-1) is the public API's per-key ceiling, not a per-IP one. It is
// 0 below Scale because `apiAccess` is false there and `resolveApiKey` rejects the key before any
// limiter runs — the 0 records that "no access" and "zero budget" agree, rather than leaving a
// tier out of the table and making a reader guess which.
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
    apiRequestsPerMinute: 0,
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
    apiRequestsPerMinute: 0,
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
    apiRequestsPerMinute: 120,
  },
} as const satisfies Record<Plan, Record<string, unknown>>;

/**
 * List price per plan, in US cents per month.
 *
 * Cents rather than dollars because this is the figure MRR is summed from, and floating-point
 * dollars accumulate error once a few hundred subscriptions are added together. Rendering is the
 * caller's job — `planPriceLabel` below produces the two forms the app actually uses.
 *
 * It lives here, beside PLAN_LIMITS, for the same reason the seeded demo figures live in exactly
 * one file (CLAUDE.md): the price was previously written out three separate times — the pricing
 * page, the pricing teaser, and the billing settings section — each with its own formatting. Two
 * of those carried a comment claiming the number was derived from PLAN_LIMITS when it was a
 * literal sitting next to it. Import this; do not retype the number.
 *
 * Stripe stays the authority on what a customer is actually charged (PLAN_PRICE_ENV in
 * apps/api/src/billing.ts holds the price ids). This is the list price we quote and report on.
 */
export const PLAN_PRICE_USD_CENTS = {
  starter: 7_900,
  growth: 19_900,
  scale: 39_900,
} as const satisfies Record<Plan, number>;

/** `$199`, or `$199/mo` with `perMonth`. Every list price is a whole number of dollars. */
export function planPriceLabel(plan: Plan, opts?: { perMonth?: boolean }): string {
  return `$${PLAN_PRICE_USD_CENTS[plan] / 100}${opts?.perMonth ? "/mo" : ""}`;
}

// Metered/gated features (M5 P5.2). `limit: null` means unlimited (Infinity isn't valid JSON).
export type CountedMetric = "recommendations_generated" | "ai_creatives_generated";
export type BooleanFeature = "whiteLabel" | "geoTracking" | "apiAccess";

export interface UsageSummary {
  plan: Plan;
  metrics: Array<{ metric: CountedMetric; used: number; limit: number | null }>;
  features: Array<{ feature: BooleanFeature; enabled: boolean }>;
}

// ── WebSocket events (stub — fleshed out in M2) ──────────────────────────────

export type WebSocketEvent =
  | { type: "job:complete"; jobId: string; workspaceId: string }
  | { type: "recommendation:new"; workspaceId: string; recommendationId: string }
  | { type: "meta:fatigue_alert"; workspaceId: string; adSetId: string }
  | { type: "analytics:mer_alert"; workspaceId: string }
  | { type: "report:ready"; workspaceId: string; periodStart: string };
