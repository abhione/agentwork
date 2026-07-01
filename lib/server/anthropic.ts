/**
 * Server-side Anthropic key resolution.
 * Order: ANTHROPIC_API_KEY env → .env.local (handled by Next) → ~/.openclaw/credentials/anthropic-key
 * The key never leaves the server.
 */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export function getAnthropicKey(): string | null {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY.trim();
  try {
    const key = readFileSync(join(homedir(), ".openclaw", "credentials", "anthropic-key"), "utf-8").trim();
    if (key) return key;
  } catch {}
  return null;
}
