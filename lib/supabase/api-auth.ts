/**
 * Auth resolution for API route handlers.
 *
 * Resolves the calling user from the Supabase session cookie (browser
 * clients) or, as a fallback, from an `Authorization: Bearer <access_token>`
 * header (programmatic API access). Either way the returned Supabase client
 * is scoped to that user's JWT, so RLS applies to every query made with it.
 */
import type { NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export interface ApiAuth {
  user: User;
  supabase: SupabaseClient;
}

export async function resolveApiUser(req: NextRequest): Promise<ApiAuth | null> {
  // 1. Cookie session (normal browser flow).
  const cookieClient = await createServerClient();
  const {
    data: { user: cookieUser },
  } = await cookieClient.auth.getUser();
  if (cookieUser) return { user: cookieUser, supabase: cookieClient };

  // 2. Bearer access token (curl / API clients). The token is validated
  //    against Supabase Auth; the client carries it on every request so
  //    PostgREST enforces the same RLS as the cookie path.
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerClient = createSupabaseJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    const {
      data: { user: bearerUser },
    } = await bearerClient.auth.getUser(authHeader.slice("Bearer ".length));
    if (bearerUser) return { user: bearerUser, supabase: bearerClient };
  }

  return null;
}
