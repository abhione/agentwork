/**
 * Chat thread persistence for the team dashboard.
 *
 * Threads are keyed by (account user, box id) and stored in the
 * `chat_messages` table (RLS: users only see their own rows).
 *
 *   GET    /api/chat/history?boxId=…   → { messages: [{ role, content, createdAt }] }
 *   POST   /api/chat/history           { boxId, messages: [{ role, content }] }
 *   DELETE /api/chat/history?boxId=…   → clears the thread (e.g. on terminate)
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveApiUser } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";

const MAX_MESSAGES_PER_POST = 20;
const MAX_CONTENT_CHARS = 64_000;
const HISTORY_LIMIT = 500;

export async function GET(req: NextRequest) {
  const auth = await resolveApiUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const boxId = req.nextUrl.searchParams.get("boxId");
  if (!boxId) return NextResponse.json({ error: "boxId is required" }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("user_id", auth.user.id)
    .eq("box_id", boxId)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);

  if (error) {
    return NextResponse.json({ error: "Failed to load chat history" }, { status: 500 });
  }

  return NextResponse.json({
    messages: (data ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content as string,
      createdAt: m.created_at as string,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await resolveApiUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { boxId?: string; messages?: { role?: string; content?: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const boxId = typeof body.boxId === "string" ? body.boxId.trim() : "";
  if (!boxId) return NextResponse.json({ error: "boxId is required" }, { status: 400 });
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }
  if (body.messages.length > MAX_MESSAGES_PER_POST) {
    return NextResponse.json({ error: "Too many messages in one request" }, { status: 400 });
  }

  const rows = [];
  for (const m of body.messages) {
    if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content.trim()) {
      return NextResponse.json(
        { error: "Each message needs role user|assistant and non-empty content" },
        { status: 400 }
      );
    }
    rows.push({
      user_id: auth.user.id,
      box_id: boxId,
      role: m.role,
      content: m.content.slice(0, MAX_CONTENT_CHARS),
    });
  }

  const { error } = await auth.supabase.from("chat_messages").insert(rows);
  if (error) {
    return NextResponse.json({ error: "Failed to save chat messages" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}

export async function DELETE(req: NextRequest) {
  const auth = await resolveApiUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const boxId = req.nextUrl.searchParams.get("boxId");
  if (!boxId) return NextResponse.json({ error: "boxId is required" }, { status: 400 });

  const { error } = await auth.supabase
    .from("chat_messages")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("box_id", boxId);

  if (error) {
    return NextResponse.json({ error: "Failed to clear chat history" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
