/**
 * Supabase Auth Webhook - handles new user signups
 * Sends email notification to admin for approval
 * 
 * Configure in Supabase Dashboard:
 * Authentication > Hooks > Add Hook > HTTP Request
 * Event: user.created
 * URL: https://agentwork.fly.dev/api/webhooks/signup
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "abhi@sequoiadigital.io";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://agentwork.fly.dev";

export async function POST(request: Request) {
  // Verify webhook signature if configured
  const headersList = await headers();
  const signature = headersList.get("x-supabase-signature");
  
  if (process.env.SUPABASE_WEBHOOK_SECRET && signature) {
    const body = await request.text();
    const expectedSig = crypto
      .createHmac("sha256", process.env.SUPABASE_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");
    
    if (signature !== expectedSig) {
      console.error("[WEBHOOK] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Re-parse body after verification
    const payload = JSON.parse(body);
    return handleSignup(payload);
  }

  // No signature verification - parse directly
  const payload = await request.json();
  return handleSignup(payload);
}

async function handleSignup(payload: any) {
  const { type, record } = payload;

  // Only handle user.created events
  if (type !== "INSERT" || !record?.email) {
    return NextResponse.json({ message: "Ignored" });
  }

  const userId = record.id;
  const email = record.email;
  const createdAt = record.created_at;

  console.log(`[SIGNUP] New user: ${email} (${userId})`);

  // Generate approval/rejection tokens
  const approveToken = generateToken(userId, "approve");
  const rejectToken = generateToken(userId, "reject");

  const approveUrl = `${APP_URL}/api/admin/approve?user=${userId}&token=${approveToken}`;
  const rejectUrl = `${APP_URL}/api/admin/reject?user=${userId}&token=${rejectToken}`;

  // Send notification email to admin
  await sendAdminNotification({
    userEmail: email,
    userId,
    createdAt,
    approveUrl,
    rejectUrl,
  });

  return NextResponse.json({ success: true, message: "Admin notified" });
}

function generateToken(userId: string, action: "approve" | "reject"): string {
  const secret = process.env.APPROVAL_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-secret";
  const suffix = action === "reject" ? "-reject" : "";
  return crypto
    .createHmac("sha256", secret)
    .update(userId + suffix)
    .digest("hex")
    .slice(0, 32);
}

interface NotificationParams {
  userEmail: string;
  userId: string;
  createdAt: string;
  approveUrl: string;
  rejectUrl: string;
}

async function sendAdminNotification(params: NotificationParams) {
  const { userEmail, userId, createdAt, approveUrl, rejectUrl } = params;

  // Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "AgentWork <noreply@agentwork.fly.dev>",
          to: ADMIN_EMAIL,
          subject: `🔔 New AgentWork Signup: ${userEmail}`,
          html: generateEmailHtml(params),
          text: generateEmailText(params),
        }),
      });

      if (!response.ok) {
        console.error("[EMAIL] Resend failed:", await response.text());
      } else {
        console.log("[EMAIL] Admin notification sent via Resend");
        return;
      }
    } catch (error) {
      console.error("[EMAIL] Resend error:", error);
    }
  }

  // Fallback: log the approval links (dev mode)
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 NEW AGENTWORK SIGNUP REQUIRES APPROVAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${userEmail}
User ID: ${userId}
Signed up: ${new Date(createdAt).toLocaleString()}

✅ APPROVE: ${approveUrl}
❌ REJECT:  ${rejectUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

function generateEmailHtml(params: NotificationParams): string {
  const { userEmail, userId, createdAt, approveUrl, rejectUrl } = params;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: system-ui, -apple-system, sans-serif;">
  <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 32px;">
      <h1 style="color: #fff; font-size: 20px; margin: 0 0 24px;">
        🔔 New Signup Request
      </h1>
      
      <div style="background: #262626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #a1a1aa; margin: 0 0 8px; font-size: 14px;">Email</p>
        <p style="color: #fff; margin: 0; font-size: 16px; font-weight: 500;">${userEmail}</p>
      </div>
      
      <div style="background: #262626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #a1a1aa; margin: 0 0 8px; font-size: 14px;">Signed up</p>
        <p style="color: #fff; margin: 0; font-size: 14px;">${new Date(createdAt).toLocaleString()}</p>
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <a href="${approveUrl}" style="flex: 1; display: inline-block; background: #10b981; color: #fff; text-align: center; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          ✓ Approve
        </a>
        <a href="${rejectUrl}" style="flex: 1; display: inline-block; background: #ef4444; color: #fff; text-align: center; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          ✗ Reject
        </a>
      </div>
      
      <p style="color: #525252; font-size: 12px; margin: 24px 0 0; text-align: center;">
        User ID: ${userId}
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generateEmailText(params: NotificationParams): string {
  const { userEmail, userId, createdAt, approveUrl, rejectUrl } = params;
  
  return `
NEW AGENTWORK SIGNUP REQUIRES APPROVAL

Email: ${userEmail}
User ID: ${userId}
Signed up: ${new Date(createdAt).toLocaleString()}

APPROVE: ${approveUrl}

REJECT: ${rejectUrl}
`;
}
