import { NextResponse, type NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";

type Session = { user?: { id: string } } | null;

/**
 * The signed-in gate for the routes in `config.matcher` below.
 *
 * **A UX gate, not the security boundary.** It decides what renders; it does not protect data.
 * Every `/api/v1` route independently requires a session and workspace membership server-side, and
 * every admin route independently requires a platform role, so nothing here is the only thing
 * standing between a request and a customer's records. Same relationship the `(admin)` layout has
 * with `routes/admin.ts`.
 *
 * That is what decides the catch below.
 */
export async function middleware(request: NextRequest) {
  let session: Session = null;

  try {
    ({ data: session } = await betterFetch<Session>("/api/auth/get-session", {
      baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
      headers: { cookie: request.headers.get("cookie") ?? "" },
    }));
  } catch {
    /**
     * The API could not be reached at all — which is not an answer about who you are.
     *
     * `betterFetch` throws on a transport failure rather than resolving with an error, and nothing
     * caught it, so "the API is not up yet" surfaced as a raw `fetch failed` runtime error page.
     * That happens on every `pnpm dev` restart, because turbo builds three packages before the API
     * binds while Next starts serving almost immediately, and it would happen on any backend blip
     * in production.
     *
     * Letting the request through, rather than redirecting to sign-in, for two reasons:
     *
     * 1. It is what the rest of the app already does. Every feature hook falls through `liveOrMock`
     *    to fixtures when the API is unreachable, and `DataSourceBadge` says so on screen. The page
     *    renders its offline state, which is a designed state, instead of a lie.
     * 2. Redirecting would tell a signed-in person they are signed out, which is false, and send
     *    them to a form that cannot work either — signing in also needs the API.
     *
     * The cost is that an unreachable API bypasses this gate. Given the gate is UX-only, what that
     * buys an attacker is a dashboard shell full of fixture data, because every call that would
     * fetch real records is failing for the same reason. No real data is behind this branch.
     */
    return NextResponse.next();
  }

  // The API answered and said nobody is signed in. That IS an answer, and it is acted on.
  if (!session) {
    const url = new URL("/sign-in", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/business-info/:path*",
    "/connect-accounts/:path*",
    "/create-workspace/:path*",
    "/onboarding-complete/:path*",
    "/growth-hub/:path*",
  ],
};
