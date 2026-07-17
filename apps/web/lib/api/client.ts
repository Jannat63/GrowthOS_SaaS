/**
 * API client — talks to the Fastify API's versioned domain surface (`/api/v1`).
 * Sends the Better Auth session cookie (credentials: "include"). Callers in
 * lib/hooks/* catch failures and fall back to running a lib/logic engine over
 * lib/mock-data, so the app renders even when the backend isn't reachable.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new ApiError(`API ${res.status} on ${path}`, res.status);
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
