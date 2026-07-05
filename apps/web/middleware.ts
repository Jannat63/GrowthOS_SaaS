import { NextResponse, type NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";

type Session = { user?: { id: string } } | null;

export async function middleware(request: NextRequest) {
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
      headers: { cookie: request.headers.get("cookie") ?? "" },
    }
  );

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
  ],
};
