/**
 * Auth-gated server-side proxy to the Box Claws API.
 *
 * Why this exists:
 * - The platform's Anthropic API key is injected HERE, server-side, from env.
 *   Clients never see or supply a key — compute is billed through the platform
 *   (this is the foundation for the billing/usage features).
 * - Box Claws may live on a private host (BOXCLAWS_URL); the browser can't
 *   reach it directly and shouldn't know where it is.
 *
 * Routes:
 *   GET  /api/boxclaws/health          → ${BOXCLAWS_URL}/health (auth required)
 *   *    /api/boxclaws/boxes[/...]     → ${BOXCLAWS_URL}/api/boxes[/...]
 *
 * POST /api/boxclaws/boxes gets `anthropicApiKey` injected from env; any
 * client-supplied key is discarded.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveApiUser } from "@/lib/supabase/api-auth";

const BOXCLAWS_URL = process.env.BOXCLAWS_URL || "http://localhost:3457";
const TIMEOUT_MS = 15_000;
// Box creation pulls/starts a container and waits for the agent gateway —
// give it much longer than regular reads.
const DEPLOY_TIMEOUT_MS = 120_000;
// Live-agent chat runs a real agent turn (tool use, browser) — allow minutes.
const CHAT_TIMEOUT_MS = 240_000;

function upstreamUrl(path: string[]): string {
  if (path.length === 1 && path[0] === "health") return `${BOXCLAWS_URL}/health`;
  return `${BOXCLAWS_URL}/api/${path.map(encodeURIComponent).join("/")}`;
}

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const auth = await resolveApiUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { user, supabase } = auth;

  const { path } = await params;
  if (!path?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = upstreamUrl(path);
  const isDeploy = req.method === "POST" && path.length === 1 && path[0] === "boxes";
  const isChat =
    req.method === "POST" && path.length === 3 && path[0] === "boxes" && path[2] === "chat";
  const init: RequestInit = {
    method: req.method,
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(
      isDeploy ? DEPLOY_TIMEOUT_MS : isChat ? CHAT_TIMEOUT_MS : TIMEOUT_MS
    ),
  };

  // For chat turns: the last user message, persisted with the agent reply.
  let chatUserMessage: string | null = null;
  const chatBoxId = isChat ? path[1] : null;

  if (req.method !== "GET" && req.method !== "HEAD") {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine for POST start/stop endpoints
    }

    // Deploy call: inject the platform key server-side; never trust client keys.
    if (req.method === "POST" && path.length === 1 && path[0] === "boxes") {
      const platformKey = process.env.ANTHROPIC_API_KEY;
      if (!platformKey) {
        return NextResponse.json(
          { error: "Platform compute key not configured" },
          { status: 503 }
        );
      }
      delete body.anthropicApiKey;
      body = { ...body, anthropicApiKey: platformKey };
    }

    // Chat call: pin a stable per-(account, box) session key. The box gateway's
    // chat-completions endpoint is stateless per request by default; passing a
    // stable OpenAI `user` value makes it reuse one agent session, so the agent
    // remembers earlier messages in the thread. Never trust a client-supplied
    // value (it could hijack another user's session on a shared gateway).
    if (isChat && chatBoxId) {
      body.user = `agentwork:${user.id}:${chatBoxId}`;
      const msgs = Array.isArray(body.messages) ? (body.messages as unknown[]) : [];
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i] as { role?: string; content?: unknown };
        if (m?.role === "user" && typeof m.content === "string" && m.content.trim()) {
          chatUserMessage = m.content;
          break;
        }
      }
    }

    if (Object.keys(body).length > 0) init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let sanitized = text;
    try {
      // Strip any key echo from upstream responses before they reach the client.
      const json = JSON.parse(text);
      scrub(json);
      sanitized = JSON.stringify(json);
    } catch {
      // non-JSON (e.g. plain health "ok") passes through
    }
    // Persist the completed live-chat turn server-side so the thread survives
    // reloads even if the client disconnects before saving.
    if (isChat && chatBoxId && res.ok) {
      try {
        const json = JSON.parse(text) as {
          choices?: { message?: { content?: string } }[];
        };
        const reply = json?.choices?.[0]?.message?.content;
        if (typeof reply === "string" && reply.trim()) {
          const rows: { user_id: string; box_id: string; role: string; content: string }[] = [];
          if (chatUserMessage) {
            rows.push({ user_id: user.id, box_id: chatBoxId, role: "user", content: chatUserMessage });
          }
          rows.push({ user_id: user.id, box_id: chatBoxId, role: "assistant", content: reply });
          const { error: saveErr } = await supabase.from("chat_messages").insert(rows);
          if (saveErr) console.error("chat_messages insert failed:", saveErr.message);
        }
      } catch {
        // streaming/non-JSON responses aren't persisted here
      }
    }

    return new NextResponse(sanitized, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "Box Claws infrastructure is offline", offline: true },
      { status: 502 }
    );
  }
}

function scrub(obj: unknown): void {
  if (Array.isArray(obj)) return obj.forEach(scrub);
  if (obj && typeof obj === "object") {
    const rec = obj as Record<string, unknown>;
    for (const k of Object.keys(rec)) {
      if (/anthropic|apikey|api_key|token|secret/i.test(k)) delete rec[k];
      else scrub(rec[k]);
    }
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
