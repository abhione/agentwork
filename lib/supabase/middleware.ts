/**
 * Middleware Supabase helper: refreshes the auth session cookie and
 * enforces authentication + approval for all non-public routes.
 * 
 * Auth flow:
 * 1. User signs up → email verification required
 * 2. User verifies email → account created with status="pending"
 * 3. Admin receives notification → approves/rejects user
 * 4. User can only access app after approval
 * 5. MFA enrollment required on first approved login
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// "/" is the public marketing landing page. Everything else (marketplace,
// talent profiles, interviews, team) stays behind auth + approval.
const PUBLIC_PATHS = ["/", "/login", "/pending", "/rejected", "/robots.txt", "/favicon.ico"];
const MFA_PATHS = ["/mfa/setup", "/mfa/verify"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (MFA_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
  // API routes for approval actions and webhooks (secured by their own checks)
  if (pathname.startsWith("/api/admin/")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  return false;
}

export async function updateSession(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser() —
  // it can cause hard-to-debug session issues.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    // Unauthenticated API requests → 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Unauthenticated page requests → redirect to /login with return path
    const loginUrl = new URL("/login", req.url);
    const next = pathname + req.nextUrl.search;
    if (next !== "/marketplace") loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  // For authenticated users, enforce MFA (AAL2) when the user has a
  // verified TOTP factor. Without this, MFA is only a client-side redirect
  // and can be bypassed by navigating directly.
  if (user && !isPublicPath(pathname) && !MFA_PATHS.includes(pathname)) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "MFA required" }, { status: 401 });
      }
      const verifyUrl = new URL("/mfa/verify", req.url);
      verifyUrl.searchParams.set("next", pathname + req.nextUrl.search);
      return NextResponse.redirect(verifyUrl);
    }
  }

  // For authenticated users, check approval status
  if (user && !isPublicPath(pathname)) {
    // Fetch user profile to check approval status
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    const status = profile?.status;

    // Pending users → redirect to pending page
    if (status === "pending") {
      if (pathname !== "/pending") {
        return NextResponse.redirect(new URL("/pending", req.url));
      }
    }

    // Rejected users → redirect to rejected page
    if (status === "rejected") {
      if (pathname !== "/rejected") {
        return NextResponse.redirect(new URL("/rejected", req.url));
      }
    }

    // Suspended users → sign out and redirect to login
    if (status === "suspended") {
      // Clear the session cookies
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "account_suspended");
      res = NextResponse.redirect(loginUrl);
      // The actual sign-out will happen client-side
      return res;
    }

    // If no profile exists yet (race condition), treat as pending
    if (!profile && pathname !== "/pending") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }
  }

  // Signed-in users hitting /login → send to the marketplace (or ?next=)
  if (user && pathname === "/login") {
    // But first check their approval status
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    if (profile?.status === "pending") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }
    if (profile?.status === "rejected") {
      return NextResponse.redirect(new URL("/rejected", req.url));
    }

    const nextParam = req.nextUrl.searchParams.get("next");
    const target =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/marketplace";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return res;
}
