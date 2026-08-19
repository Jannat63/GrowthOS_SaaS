/**
 * API client — talks to the Fastify API's versioned domain surface (`/api/v1`).
 * Sends the Better Auth session cookie (credentials: "include").
 */
import type { ApiErrorBody, ErrorCode } from "@growthos/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Requests are given a generous ceiling rather than a snappy one.
 *
 * This was 4 seconds, which is shorter than the backend's own worst case: a single query against
 * the hosted database was measured at 17 seconds during the 2026-08-13 audit, and the PDF export
 * runs a headless browser. A timeout below the real latency floor doesn't protect anyone — it turns
 * a slow-but-working backend into an error, and (before `liveOrMock` was fixed) into fabricated
 * data. The ceiling exists to stop a hung request pinning a query forever, nothing more.
 */
const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    /** The API's typed error code, when it sent one — e.g. PLAN_LIMIT_REACHED. */
    public code?: ErrorCode
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** 4xx: the request itself was refused. Retrying or faking a result would both be wrong. */
  get isClientError(): boolean {
    return this.status !== undefined && this.status >= 400 && this.status < 500;
  }
}

/**
 * Turns a failed response into an ApiError carrying the server's own message.
 *
 * The API answers every failure with `{ error: { code, message, statusCode } }`, and those messages
 * are written to be read by a person — "You've reached your starter plan's limit (5) for this
 * feature this week." This client used to discard all of it and throw `API 402 on /path`, which
 * made every one of those messages dead weight.
 */
async function toApiError(res: Response, path: string): Promise<ApiError> {
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    if (body?.error?.message) {
      return new ApiError(body.error.message, res.status, body.error.code);
    }
  } catch {
    // Not JSON, or an empty body — fall through to the generic message below.
  }
  return new ApiError(`Request failed (${res.status}) on ${path}`, res.status);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
  if (!res.ok) throw await toApiError(res, path);
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
