/**
 * Login endpoint: verifies the shared access password and sets an
 * HMAC-signed, HTTP-only session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getAuthPassword,
  getAuthSecret,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = getAuthSecret();
  const expected = getAuthPassword();

  if (!secret || !expected) {
    return NextResponse.json(
      {
        error:
          "Auth is not configured. Set AUTH_PASSWORD and AUTH_SECRET environment variables.",
      },
      { status: 500 }
    );
  }

  let password: unknown;
  try {
    ({ password } = (await req.json()) as { password?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof password !== "string" || !(await verifyPassword(password, expected, secret))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await createSessionToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
