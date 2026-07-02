/**
 * Admin approval endpoint - approves a pending user
 * Can be called via email link with token or by authenticated admin
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
    // Token-based approval from email link
    return handleTokenApproval(userId, token);
  }

  return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
}

export async function POST(request: Request) {
  // Admin dashboard approval
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

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  return approveUser(userId, user.id);
}

async function handleTokenApproval(userId: string, token: string) {
  // Verify the approval token
  const expectedToken = generateApprovalToken(userId);
  
  if (token !== expectedToken) {
    return new NextResponse(renderErrorPage("Invalid or expired approval link"), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const result = await approveUser(userId, null);
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

async function approveUser(userId: string, approvedBy: string | null) {
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

  if (profile.status === "approved") {
    return NextResponse.json({ 
      message: "User already approved", 
      email: profile.email 
    });
  }

  // Update user status to approved
  const { error: updateError } = await admin
    .from("user_profiles")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to approve user:", updateError);
    return NextResponse.json({ error: "Failed to approve user" }, { status: 500 });
  }

  // Send approval notification email to the user
  await sendApprovalEmail(profile.email);

  return NextResponse.json({ 
    success: true, 
    message: "User approved successfully",
    email: profile.email 
  });
}

function generateApprovalToken(userId: string): string {
  // Simple HMAC-based token for email approval links
  // In production, use a proper JWT or store tokens in DB with expiry
  const secret = process.env.APPROVAL_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

async function sendApprovalEmail(email: string) {
  // TODO: Integrate with email service (Resend, SendGrid, etc.)
  // For now, just log
  console.log(`[APPROVAL] User approved: ${email}`);
}

function renderSuccessPage(email: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>User Approved - AgentWork</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 32px; max-width: 400px; text-align: center; }
    .icon { width: 48px; height: 48px; background: rgba(16, 185, 129, 0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    .icon svg { width: 24px; height: 24px; color: #10b981; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { color: #a1a1aa; margin: 0; font-size: 14px; }
    .email { color: #fff; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1>User Approved!</h1>
    <p><span class="email">${email}</span> can now access AgentWork.</p>
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
    .icon { width: 48px; height: 48px; background: rgba(239, 68, 68, 0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    .icon svg { width: 24px; height: 24px; color: #ef4444; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { color: #a1a1aa; margin: 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
    <h1>Approval Failed</h1>
    <p>${error}</p>
  </div>
</body>
</html>`;
}

