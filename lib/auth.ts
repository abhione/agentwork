/**
 * Zero-dependency session auth: HMAC-SHA256 signed tokens via Web Crypto.
 * Works in both the Edge middleware runtime and Node route handlers.
 *
 * Token format: `<expiryEpochMs>.<hmacHex(expiryEpochMs)>`
 */

export const SESSION_COOKIE = "agentwork_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

const DEV_PASSWORD = "agentwork-dev";
const DEV_SECRET = "agentwork-dev-secret-do-not-use-in-production";

/** AUTH_SECRET from env; dev fallback outside production, null in production. */
export function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_SECRET;
  return null;
}

/** AUTH_PASSWORD from env; dev fallback outside production, null in production. */
export function getAuthPassword(): string | null {
  const password = process.env.AUTH_PASSWORD;
  if (password) return password;
  if (process.env.NODE_ENV !== "production") return DEV_PASSWORD;
  return null;
}

const encoder = new TextEncoder();

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Constant-time password check (compares HMAC digests, not raw strings). */
export async function verifyPassword(
  provided: string,
  expected: string,
  secret: string
): Promise<boolean> {
  const [a, b] = await Promise.all([
    hmacHex(secret, `pw:${provided}`),
    hmacHex(secret, `pw:${expected}`),
  ]);
  return timingSafeEqualStr(a, b);
}

/** Create a signed session token expiring `maxAgeSeconds` from now. */
export async function createSessionToken(
  secret: string,
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS
): Promise<string> {
  const exp = String(Date.now() + maxAgeSeconds * 1000);
  const sig = await hmacHex(secret, exp);
  return `${exp}.${sig}`;
}

/** Verify signature + expiry of a session token. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || !sig) return false;
  const expected = await hmacHex(secret, exp);
  if (!timingSafeEqualStr(sig, expected)) return false;
  return Date.now() < Number(exp);
}
