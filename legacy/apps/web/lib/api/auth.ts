import { api } from "@/lib/api/client";

export interface AuthResponse {
  token: string;
  userId: string;
  workspaceId: string;
  fullName: string;
  email: string;
}

export function signUp(input: { fullName: string; email: string; password: string; workspaceName?: string }) {
  return api.post<AuthResponse>("/api/auth/sign-up", input);
}

export function signIn(input: { email: string; password: string }) {
  return api.post<AuthResponse>("/api/auth/sign-in", input);
}

export function getMe(token: string) {
  return fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => {
    if (!r.ok) throw new Error("Not authenticated");
    return r.json();
  });
}

const TOKEN_COOKIE = "gos_token";

export function storeSession(auth: AuthResponse) {
  // localStorage: used by client fetches to attach the Authorization header.
  localStorage.setItem("gos_token", auth.token);
  localStorage.setItem("gos_user", JSON.stringify(auth));
  // Cookie: used by middleware.ts to protect dashboard routes server-side.
  // Not httpOnly because it's set client-side after a fetch response, not a
  // server Set-Cookie header — acceptable for this stage, but the real
  // production version should have the auth-service set an httpOnly cookie
  // directly so JS can't read the token at all.
  document.cookie = `${TOKEN_COOKIE}=${auth.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
}

export function clearSession() {
  localStorage.removeItem("gos_token");
  localStorage.removeItem("gos_user");
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

export function getStoredUser(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("gos_user");
  return raw ? JSON.parse(raw) : null;
}
