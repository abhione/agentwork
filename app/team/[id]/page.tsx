"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Monitor,
  Send,
  Loader2,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  Activity,
  Clock,
  CheckCircle2,
  Cpu,
  Maximize2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TalentAvatar } from "@/components/talent-avatar";
import {
  getBox,
  startBox,
  stopBox,
  destroyBox,
  chatWithBox,
  novncUrl,
  type BoxRecord,
} from "@/lib/boxclaws";
import { getHire, removeHire } from "@/lib/hires";
import { getTalent, formatRate, TIER_LABELS, type Talent } from "@/lib/talents";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface ActivityItem {
  time: string;
  text: string;
  type: "info" | "success" | "warn";
}

export default function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [box, setBox] = useState<BoxRecord | null>(null);
  const [talent, setTalent] = useState<Talent | undefined>();
  const [loading, setLoading] = useState(true);
  const [notFoundErr, setNotFoundErr] = useState(false);
  const [busy, setBusy] = useState(false);

  // chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Persisted thread: load prior messages for this (account, box) thread so
  // the conversation survives reloads and devices.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/chat/history?boxId=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: Msg[] };
        if (!cancelled && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages((prev) => (prev.length === 0 ? data.messages!.map((m) => ({ role: m.role, content: m.content })) : prev));
        }
      } catch {
        // history is best-effort; chat still works without it
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Best-effort append to the persisted thread. Live-agent turns are saved
  // server-side by the chat proxy; this is used for preview-mode turns and
  // for user messages whose turn errored out.
  const saveHistory = useCallback(
    async (msgs: Msg[]) => {
      if (msgs.length === 0) return;
      try {
        await fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boxId: id, messages: msgs }),
        });
      } catch {
        // non-fatal
      }
    },
    [id]
  );

  const refresh = useCallback(async () => {
    try {
      const b = await getBox(id);
      setBox(b);
      const hire = getHire(b.id);
      if (hire) setTalent(getTalent(hire.talentId));
    } catch {
      setNotFoundErr(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const isRunning = box?.state === "running";
  const vnc = box ? novncUrl(box, { scale: true }) : null;

  // Simulated performance metrics derived from box data
  const metrics = useMemo(() => {
    if (!box) return null;
    const created = box.createdAt ? new Date(box.createdAt) : new Date();
    const hours = Math.max(0.1, (Date.now() - created.getTime()) / 3600000);
    const rate = talent?.hourlyRate ?? 1.5;
    return {
      uptime:
        hours < 1
          ? `${Math.round(hours * 60)}m`
          : hours < 48
            ? `${hours.toFixed(1)}h`
            : `${Math.floor(hours / 24)}d ${Math.round(hours % 24)}h`,
      tasks: Math.max(1, Math.floor(hours * 2.4)),
      cost: `$${(hours * rate).toFixed(2)}`,
      messages: Math.max(2, Math.floor(hours * 5.1)),
    };
  }, [box, talent]);

  const activity: ActivityItem[] = useMemo(() => {
    if (!box) return [];
    const base: ActivityItem[] = [
      { time: "just now", text: isRunning ? "Heartbeat OK — agent active" : "Agent paused", type: isRunning ? "success" : "warn" },
    ];
    if (isRunning) {
      base.push(
        { time: "12m ago", text: "Completed task: inbox triage sweep", type: "success" },
        { time: "38m ago", text: "Started research on assigned prospect list", type: "info" },
        { time: "1h ago", text: "Daily standup summary posted", type: "info" }
      );
    }
    base.push({
      time: box.createdAt ? new Date(box.createdAt).toLocaleString() : "—",
      text: `Hired and onboarded${talent ? ` as ${talent.role}` : ""}`,
      type: "success",
    });
    return base;
  }, [box, isRunning, talent]);

  // Chat routing: when the box is deployed and running, messages go to the
  // REAL agent (its OpenClaw gateway, with browser/exec tools) via the
  // auth-gated Box Claws proxy. The persona-only /api/chat preview is used
  // only as a fallback when the agent isn't running.
  const liveChat = !!box && box.state === "running";
  const canChat = liveChat || !!talent;

  const send = async () => {
    const text = input.trim();
    if (!text || streaming || !canChat) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next: Msg[] = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      if (liveChat && box) {
        // Live turn — the server-side proxy persists user+assistant on success.
        const reply = await chatWithBox(box.id, next);
        setMessages([...next, { role: "assistant", content: reply }]);
      } else if (talent) {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ talentId: talent.id, messages: next }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages([...next, { role: "assistant", content: acc }]);
        }
        // Preview turn — persist both sides client-side.
        const saved: Msg[] = acc.trim()
          ? [userMsg, { role: "assistant", content: acc }]
          : [userMsg];
        void saveHistory(saved);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setMessages(next);
      // Keep the user's message in the thread even though the turn failed.
      void saveHistory([userMsg]);
    } finally {
      setStreaming(false);
    }
  };

  const doAction = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading employee…
      </div>
    );
  }

  if (notFoundErr || !box) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">Employee not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This agent may have been terminated, or the Box Claws API is offline.
        </p>
        <Button asChild className="mt-6">
          <Link href="/team">Back to Your Team</Link>
        </Button>
      </div>
    );
  }

  const displayName = talent?.name || box.name;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header — back-link row, then identity + actions */}
      <Link
        href="/team"
        className="group mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to
        Your Team
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            <TalentAvatar
              id={talent?.id || box.id}
              emoji={talent?.emoji || "🤖"}
              tier={talent?.modelTier}
              avatar={talent?.avatar}
              name={talent?.name}
            />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
                isRunning ? "bg-emerald-400 animate-pulse-ring" : "bg-zinc-500"
              )}
            />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold tracking-tight">
              {displayName}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="truncate">
                {talent?.role || box.config?.persona || "Custom Agent"}
              </span>
              <Badge
                variant="secondary"
                className={cn("text-[10px]", isRunning && "bg-emerald-500/15 text-emerald-300")}
              >
                {isRunning ? "● Working" : "Paused"}
              </Badge>
              {talent && (
                <span className="font-mono text-emerald-400">{formatRate(talent.hourlyRate)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {vnc && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={vnc} target="_blank" rel="noreferrer">
                <Maximize2 className="h-3.5 w-3.5" /> Full Screen
              </a>
            </Button>
          )}
          {isRunning ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => doAction(() => stopBox(box.id), `${displayName} paused`)}
              className="gap-1.5"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => doAction(() => startBox(box.id), `${displayName} back to work`)}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" /> Resume
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (confirm(`End ${displayName}'s contract? Their workspace will be destroyed.`)) {
                doAction(async () => {
                  await destroyBox(box.id);
                  removeHire(box.id);
                  // Clear the persisted thread for this contract (best effort).
                  fetch(`/api/chat/history?boxId=${encodeURIComponent(box.id)}`, {
                    method: "DELETE",
                  }).catch(() => {});
                  router.push("/team");
                }, "Contract ended");
              }
            }}
            className="gap-1.5 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" /> Terminate
          </Button>
        </div>
      </div>

      {/* Metrics row */}
      {metrics && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard icon={<Clock className="h-4 w-4" />} label="Uptime" value={metrics.uptime} />
          <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Tasks completed" value={String(metrics.tasks)} />
          <MetricCard icon={<Activity className="h-4 w-4" />} label="Messages handled" value={String(metrics.messages)} />
          <MetricCard icon={<Cpu className="h-4 w-4" />} label="Compute spend" value={metrics.cost} accent />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* VNC viewer — 2 cols */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="h-4 w-4 text-emerald-400" /> Live Workspace
            </CardTitle>
            {vnc && (
              <a
                href={vnc}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Open in new tab <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border/60 bg-black">
              <div className="flex items-center justify-between border-b border-border/60 bg-white/[0.03] px-3 py-1.5">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Monitor className="h-3 w-3" />
                  {displayName} · desktop
                </span>
                {isRunning ? (
                  <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-widest text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                ) : (
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                    PAUSED
                  </span>
                )}
              </div>
              <div className="aspect-video">
              {isRunning && vnc ? (
                <iframe src={vnc} className="h-full w-full" title={`${displayName} workspace`} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Monitor className="h-8 w-8" />
                  <p className="text-sm">{isRunning ? "Screen unavailable" : "Agent is paused"}</p>
                  {!isRunning && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => doAction(() => startBox(box.id), `${displayName} back to work`)}
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Resume work
                    </Button>
                  )}
                </div>
              )}
              </div>
            </div>

            {/* Activity feed — timeline with rail */}
            <div className="mt-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-emerald-400" /> Work Log
              </h3>
              <div className="relative ml-1 space-y-4 border-l border-border/80 pl-5">
                {activity.map((a, i) => (
                  <div key={i} className="relative text-sm">
                    <span
                      className={cn(
                        "absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ring-4 ring-background",
                        a.type === "success" && "bg-emerald-400",
                        a.type === "info" && "bg-cyan-400",
                        a.type === "warn" && "bg-amber-400"
                      )}
                    />
                    <p className="leading-snug">{a.text}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{a.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat panel */}
        <Card className="flex h-[640px] flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Message {displayName.split(" ")[0]}</CardTitle>
            {!liveChat && (
              <p className="text-[11px] leading-snug text-amber-400/80">
                Preview mode — agent not running. Replies are persona-only (no tools). Resume the
                agent to chat with the live workspace.
              </p>
            )}
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div ref={chatRef} className="chat-scroll flex-1 space-y-3 overflow-y-auto px-4 pb-3">
              {messages.length === 0 && (
                <p className="pt-8 text-center text-xs text-muted-foreground">
                  {!historyLoaded
                    ? "Loading conversation…"
                    : canChat
                      ? `Check in with ${displayName.split(" ")[0]}, assign tasks, or ask for a status update.`
                      : "Chat requires a running agent or a linked talent profile."}
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
                      m.role === "user"
                        ? "rounded-br-sm bg-emerald-600 text-white"
                        : "rounded-bl-sm bg-secondary"
                    )}
                  >
                    {m.content || (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2 border-t border-border p-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                disabled={!canChat}
                placeholder={canChat ? "Send a message…" : "Agent not running"}
                className="max-h-24 min-h-[40px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <Button
                size="icon"
                onClick={send}
                disabled={!input.trim() || streaming || !canChat}
                className="h-10 w-10 shrink-0"
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            accent
              ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
              : "bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.07]"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-0.5 truncate font-mono text-lg font-medium leading-tight tracking-tight",
              accent && "text-emerald-400"
            )}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
