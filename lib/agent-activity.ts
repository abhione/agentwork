/**
 * Agent activity — parses an OpenClaw session JSONL stream into a timeline of
 * tool-use events ("steps"). This is REAL telemetry read from the box's
 * gateway session file (via the box exec endpoint), not simulated data.
 *
 * Session record shapes (observed from OpenClaw 2026.x session files):
 *   { type: "message", timestamp, message: { role: "assistant",
 *       content: [{ type: "toolCall", id, name, arguments }, ...] } }
 *   { type: "message", timestamp, message: { role: "toolResult",
 *       toolCallId, toolName, content: [{ type: "text", text }, ...] } }
 */

export type ToolMode =
  | "browser"
  | "terminal"
  | "files"
  | "web"
  | "message"
  | "agent"
  | "other";

export interface AgentEvent {
  /** toolCallId from the gateway session */
  id: string;
  ts: string;
  tool: string;
  mode: ToolMode;
  title: string;
  detail: string;
  status: "running" | "done" | "error";
  result?: string;
  endTs?: string;
}

export interface ActivitySnapshot {
  events: AgentEvent[];
  /** Mode + label of the most recent active tool, or null when idle. */
  currentTool: { mode: ToolMode; label: string } | null;
  offline?: boolean;
}

const MODE_LABELS: Record<ToolMode, string> = {
  browser: "Browser",
  terminal: "Terminal",
  files: "Files",
  web: "Web",
  message: "Messages",
  agent: "Subagents",
  other: "Tools",
};

export function modeLabel(mode: ToolMode): string {
  return MODE_LABELS[mode];
}

function toolMode(tool: string): ToolMode {
  if (tool === "browser" || tool.startsWith("browser_")) return "browser";
  if (tool === "exec" || tool === "process" || tool === "shell") return "terminal";
  if (/^(read|write|edit|ls|find|grep|glob|apply_patch)$/.test(tool)) return "files";
  if (tool.startsWith("web") || /search|fetch|crawl/.test(tool)) return "web";
  if (/^(message|send|sms|email|slack|discord|telegram)/.test(tool)) return "message";
  if (tool.startsWith("sessions_") || tool.startsWith("agents_")) return "agent";
  return "other";
}

function toolTitle(tool: string): string {
  const titles: Record<string, string> = {
    exec: "Running a command",
    process: "Managing a process",
    browser: "Using the browser",
    web_search: "Searching the web",
    web_fetch: "Reading a web page",
    read: "Reading a file",
    write: "Writing a file",
    edit: "Editing a file",
    ls: "Listing files",
    find: "Finding files",
    grep: "Searching files",
    message: "Sending a message",
    sessions_spawn: "Delegating a subtask",
    sessions_list: "Checking subtasks",
    cron: "Scheduling work",
    canvas: "Drawing on the canvas",
    image: "Analyzing an image",
    tts: "Generating speech",
  };
  return titles[tool] || `Using ${tool.replace(/_/g, " ")}`;
}

function summarizeArgs(tool: string, args: unknown): string {
  if (args == null) return "";
  const a = (typeof args === "string" ? safeParse(args) : args) as
    | Record<string, unknown>
    | null;
  if (!a || typeof a !== "object") return truncate(String(args), 140);
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = a[k];
      if (typeof v === "string" && v.trim()) return v;
    }
    return null;
  };
  const summary =
    pick("command", "cmd") ??
    pick("url", "query", "path", "file", "filePath", "to", "target", "action", "task", "prompt") ??
    JSON.stringify(a);
  return truncate(summary, 140);
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function truncate(s: string, n: number): string {
  const line = s.replace(/\s+/g, " ").trim();
  return line.length > n ? `${line.slice(0, n - 1)}…` : line;
}

interface SessionRecord {
  type?: string;
  timestamp?: string;
  message?: {
    role?: string;
    toolCallId?: string;
    toolName?: string;
    content?: Array<{
      type?: string;
      id?: string;
      name?: string;
      arguments?: unknown;
      text?: string;
      isError?: boolean;
    }>;
  };
}

/** Parse raw session JSONL text into an ordered event timeline. */
export function parseSessionEvents(jsonl: string, limit = 100): AgentEvent[] {
  const byId = new Map<string, AgentEvent>();
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    const rec = safeParse(line) as SessionRecord | null;
    if (!rec || rec.type !== "message" || !rec.message) continue;
    const { message } = rec;
    const ts = rec.timestamp || new Date(0).toISOString();

    if (message.role === "assistant" && Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block?.type !== "toolCall" || !block.id || !block.name) continue;
        byId.set(block.id, {
          id: block.id,
          ts,
          tool: block.name,
          mode: toolMode(block.name),
          title: toolTitle(block.name),
          detail: summarizeArgs(block.name, block.arguments),
          status: "running",
        });
      }
    } else if (message.role === "toolResult" && message.toolCallId) {
      const ev = byId.get(message.toolCallId);
      if (!ev) continue;
      const text = Array.isArray(message.content)
        ? message.content.find((b) => b?.type === "text" && typeof b.text === "string")?.text ?? ""
        : "";
      const isError =
        message.content?.some((b) => b?.isError) || /^(error|failed)[:\s]/i.test(text.trim());
      ev.status = isError ? "error" : "done";
      ev.result = truncate(text, 400);
      ev.endTs = ts;
    }
  }
  return [...byId.values()].slice(-limit);
}

/** Derive the "X is using Y" header state from the timeline. */
export function currentToolFrom(events: AgentEvent[]): ActivitySnapshot["currentTool"] {
  const running = [...events].reverse().find((e) => e.status === "running");
  if (running) return { mode: running.mode, label: modeLabel(running.mode) };
  const last = events[events.length - 1];
  if (last?.endTs && Date.now() - new Date(last.endTs).getTime() < 90_000) {
    return { mode: last.mode, label: modeLabel(last.mode) };
  }
  return null;
}
