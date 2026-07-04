/**
 * API client — talks to the api-gateway (Section 6.5).
 * Falls back gracefully: if the backend isn't running (e.g. you're doing
 * `npm run dev` without `docker compose up`), callers should catch the
 * error and use mock data instead. See lib/hooks/* for that pattern.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("gos_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new ApiError(`API error ${res.status} on ${path}`, res.status);
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};
