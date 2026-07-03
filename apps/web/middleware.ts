import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/welcome",
  "/sign-up",
  "/sign-in",
  "/verify-email",
  "/create-workspace",
  "/connect-accounts",
  "/business-info",
  "/onboarding-complete",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = req.cookies.get("gos_token")?.value;

  if (!isPublic && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets / API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
