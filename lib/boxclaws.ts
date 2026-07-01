/**
 * Box Claws API client
 * Talks to the agentbox-openclaw dashboard server (default: localhost:3457)
 * via Next.js rewrites (/boxapi/* → http://localhost:3457/api/*).
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
  meta?: Record<string, unknown>;
}

export interface DeployParams {
  name: string;
  persona?: string;
  model?: string;
  anthropicApiKey: string;
  provider?: "docker" | "e2b";
  telegramToken?: string;
  telegramUserId?: string;
}

const BASE = "/boxapi";

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
    const res = await fetch("/boxhealth", { signal: AbortSignal.timeout(3000) });
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

export function novncUrl(box: BoxRecord, opts?: { scale?: boolean }): string | null {
  if (!box.ports?.novnc) return null;
  const params = opts?.scale
    ? "autoconnect=true&resize=scale&view_only=false"
    : "autoconnect=true";
  return `http://localhost:${box.ports.novnc}/vnc.html?${params}`;
}
