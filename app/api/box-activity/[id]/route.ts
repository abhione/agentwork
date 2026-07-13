/**
 * Live agent activity feed.
 *
 * Reads the tail of the box's newest OpenClaw session file through the Box
 * Claws exec endpoint and parses it into tool-use events. This is the real
 * data source behind the "Agent's Computer" steps timeline and the
 * "X is using Browser/Terminal" header — no simulated telemetry.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveApiUser } from "@/lib/supabase/api-auth";
import { parseSessionEvents, currentToolFrom } from "@/lib/agent-activity";

const BOXCLAWS_URL = process.env.BOXCLAWS_URL || "http://localhost:3457";
const TIMEOUT_MS = 15_000;

// Newest non-trajectory session file for any agent in the box, last 256KB.
// No user input is interpolated into this script.
const TAIL_SCRIPT =
  'f=$(ls -t "$HOME"/.openclaw/agents/*/sessions/*.jsonl 2>/dev/null | grep -v trajectory | head -1); ' +
  '[ -n "$f" ] && tail -c 262144 "$f"';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveApiUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const res = await fetch(
      `${BOXCLAWS_URL}/api/boxes/${encodeURIComponent(id)}/exec`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: ["sh", "-c", TAIL_SCRIPT] }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    if (!res.ok) {
      return NextResponse.json({ events: [], currentTool: null, offline: true });
    }
    const { stdout } = (await res.json()) as { stdout?: string };
    const events = parseSessionEvents(stdout || "");
    return NextResponse.json({ events, currentTool: currentToolFrom(events) });
  } catch {
    return NextResponse.json({ events: [], currentTool: null, offline: true });
  }
}
