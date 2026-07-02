/**
 * Middleware Supabase helper: refreshes the auth session cookie and
 * enforces authentication for all non-public routes.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// "/" is the public marketing landing page. Everything else (marketplace,
// talent profiles, interviews, team) stays behind auth.
const PUBLIC_PATHS = ["/", "/login", "/robots.txt", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
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

  // Signed-in users hitting /login → send to the marketplace (or ?next=)
  if (user && pathname === "/login") {
    const nextParam = req.nextUrl.searchParams.get("next");
    const target =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/marketplace";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return res;
}
