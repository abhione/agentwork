/**
 * Admin rejection endpoint - rejects a pending user
 */
import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user");
  const token = searchParams.get("token");

  if (token && userId) {
    return handleTokenRejection(userId, token);
  }

  return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if current user is admin
  const { data: adminCheck } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!adminCheck) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  const { userId, reason } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  return rejectUser(userId, reason);
}

async function handleTokenRejection(userId: string, token: string) {
  // Verify the rejection token (same as approval token)
  const expectedToken = generateRejectionToken(userId);
  
  if (token !== expectedToken) {
    return new NextResponse(renderErrorPage("Invalid or expired rejection link"), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const result = await rejectUser(userId, "Rejected via admin email link");
  const data = await result.json();

  if (data.error) {
    return new NextResponse(renderErrorPage(data.error), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new NextResponse(renderSuccessPage(data.email), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

async function rejectUser(userId: string, reason?: string) {
  const admin = createAdminClient();

  // Get user profile
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("email, status")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (profile.status === "rejected") {
    return NextResponse.json({ 
      message: "User already rejected", 
      email: profile.email 
    });
  }

  // Update user status to rejected
  const { error: updateError } = await admin
    .from("user_profiles")
    .update({
      status: "rejected",
      rejected_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to reject user:", updateError);
    return NextResponse.json({ error: "Failed to reject user" }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    message: "User rejected",
    email: profile.email 
  });
}

function generateRejectionToken(userId: string): string {
  const secret = process.env.APPROVAL_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-secret";
  // Use different suffix to make reject token different from approve token
  return crypto
    .createHmac("sha256", secret)
    .update(userId + "-reject")
    .digest("hex")
    .slice(0, 32);
}

function renderSuccessPage(email: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>User Rejected - AgentWork</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 32px; max-width: 400px; text-align: center; }
    .icon { width: 48px; height: 48px; background: rgba(239, 68, 68, 0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    .icon svg { width: 24px; height: 24px; color: #ef4444; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { color: #a1a1aa; margin: 0; font-size: 14px; }
    .email { color: #fff; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
    <h1>User Rejected</h1>
    <p><span class="email">${email}</span> has been denied access.</p>
  </div>
</body>
</html>`;
}

function renderErrorPage(error: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Error - AgentWork</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 32px; max-width: 400px; text-align: center; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { color: #a1a1aa; margin: 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Error</h1>
    <p>${error}</p>
  </div>
</body>
</html>`;
}

