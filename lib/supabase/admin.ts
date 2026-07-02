/**
 * Supabase admin client for server-side operations requiring elevated privileges.
 * Used for user approval notifications, profile management, etc.
 */
import { createClient } from "@supabase/supabase-js";

// Service role client - ONLY use server-side, never expose to browser
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type UserStatus = "pending" | "approved" | "rejected" | "suspended";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  status: UserStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  mfa_enrolled: boolean;
  created_at: string;
  updated_at: string;
}
