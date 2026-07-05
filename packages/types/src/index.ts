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

// ── Recommendations (stub — fleshed out in M2) ───────────────────────────────

export interface Recommendation {
  id: string;
  workspaceId: string;
  type: string;
  title: string;
  body: string;
  compositeScore: number;
  status: "new" | "acted" | "dismissed" | "snoozed";
}

// ── WebSocket events (stub — fleshed out in M2) ──────────────────────────────

export type WebSocketEvent =
  | { type: "job:complete"; jobId: string; workspaceId: string }
  | { type: "recommendation:new"; workspaceId: string; recommendationId: string }
  | { type: "meta:fatigue_alert"; workspaceId: string; adSetId: string }
  | { type: "analytics:mer_alert"; workspaceId: string };
