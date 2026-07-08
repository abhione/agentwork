/**
 * Box Claws API client
 * Talks to the agentbox-openclaw dashboard server through the auth-gated
 * server-side proxy at /api/boxclaws/* (which injects the platform's
 * Anthropic key — clients never handle keys; compute bills to the platform).
 */

export interface BoxRecord {
  id: string;
  name: string;
  provider: "docker" | "e2b";
  createdAt?: string;
  state?: "running" | "stopped" | "missing" | string;
  ports?: { gateway: number; vnc: number; novnc: number; browserControl: number };
  config?: {
    persona?: string;
    model?: string;
  };
  /** Public noVNC URL provided by the hosted Box Claws backend (token-guarded proxy). */
  vncUrl?: string;
  meta?: Record<string, unknown>;
}

export interface DeployParams {
  name: string;
  persona?: string;
  model?: string;
  provider?: "docker" | "e2b";
  /** Custom agent files generated from onboarding (SOUL.md, AGENTS.md, etc.) */
  agentFiles?: Record<string, string>;
  /** Raw onboarding answers (stored for re-deployment) */
  onboardingAnswers?: Record<string, string | string[]>;
}

const BASE = "/api/boxclaws";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listBoxes(): Promise<BoxRecord[]> {
  return jsonFetch<BoxRecord[]>(`${BASE}/boxes`);
}

export async function getBox(id: string): Promise<BoxRecord> {
  return jsonFetch<BoxRecord>(`${BASE}/boxes/${encodeURIComponent(id)}`);
}

export async function deployBox(params: DeployParams): Promise<BoxRecord> {
  return jsonFetch<BoxRecord>(`${BASE}/boxes`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function startBox(id: string): Promise<void> {
  await jsonFetch(`${BASE}/boxes/${encodeURIComponent(id)}/start`, { method: "POST" });
}

export async function stopBox(id: string): Promise<void> {
  await jsonFetch(`${BASE}/boxes/${encodeURIComponent(id)}/stop`, { method: "POST" });
}

export async function destroyBox(id: string): Promise<void> {
  await jsonFetch(`${BASE}/boxes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function execInBox(id: string, command: string[]): Promise<{ stdout: string; stderr: string }> {
  return jsonFetch(`${BASE}/boxes/${encodeURIComponent(id)}/exec`, {
    method: "POST",
    body: JSON.stringify({ command }),
  });
}

/**
 * Chat with a deployed box's live OpenClaw agent (real tools: browser, exec).
 * Routes: client → /api/boxclaws (auth) → Box Claws server → box gateway
 * /v1/chat/completions. The gateway token never leaves the server side.
 */
export async function chatWithBox(
  id: string,
  messages: { role: "user" | "assistant" | "system"; content: string }[]
): Promise<string> {
  const data = await jsonFetch<{ choices?: { message?: { content?: string } }[] }>(
    `${BASE}/boxes/${encodeURIComponent(id)}/chat`,
    { method: "POST", body: JSON.stringify({ messages }) }
  );
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Agent returned an empty reply");
  return reply;
}

export function novncUrl(box: BoxRecord, opts?: { scale?: boolean }): string | null {
  // Hosted backend (Fly): server returns a ready-made public URL through its
  // token-guarded VNC proxy. Prefer it.
  if (box.vncUrl) {
    if (opts?.scale && !box.vncUrl.includes("resize=")) {
      const sep = box.vncUrl.includes("?") ? "&" : "?";
      return `${box.vncUrl}${sep}resize=scale&view_only=false`;
    }
    return box.vncUrl;
  }
  // Local dev fallback: Box Claws on localhost with per-box host ports.
  if (!box.ports?.novnc) return null;
  const params = opts?.scale
    ? "autoconnect=true&resize=scale&view_only=false"
    : "autoconnect=true";
  return `http://localhost:${box.ports.novnc}/vnc.html?${params}`;
}
