import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getAuthSecret, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const secret = getAuthSecret();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = secret ? await verifySessionToken(token, secret) : false;

  if (authed) {
    return NextResponse.next();
  }

  // Unauthenticated API requests → 401 JSON
  if (pathname.startsWith("/api/") || pathname.startsWith("/boxapi/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Unauthenticated page requests → redirect to /login with return path
  const loginUrl = new URL("/login", req.url);
  const next = pathname + req.nextUrl.search;
  if (next !== "/") loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Protect everything except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)"],
};
