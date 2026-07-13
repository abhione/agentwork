"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Loader2,
  Pause,
  Play,
  Trash2,
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
import { AgentComputer } from "@/components/agent-computer";
import { useAgentActivity } from "@/lib/use-agent-activity";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
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

  // Live tool-use telemetry from the agent's OpenClaw session. Polls faster
  // while a chat turn is in flight so the computer panel tracks the work.
  const activity = useAgentActivity(id, { enabled: isRunning, fast: streaming });

  // Real metrics: uptime and billing from box age, actions from the live
  // telemetry, messages from the persisted thread.
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
      actions: activity.events.filter((e) => e.status !== "running").length,
      cost: `$${(hours * rate).toFixed(2)}`,
      messages: messages.length,
    };
  }, [box, talent, activity.events, messages.length]);

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
          <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Tool actions" value={String(metrics.actions)} />
          <MetricCard icon={<Activity className="h-4 w-4" />} label="Messages" value={String(metrics.messages)} />
          <MetricCard icon={<Cpu className="h-4 w-4" />} label="Compute spend" value={metrics.cost} accent />
        </div>
      )}

      {/* Manus-style split: chat on the left, the agent's computer on the right */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
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

        {/* The agent's computer — live desktop, terminal, files, and steps */}
        <AgentComputer
          box={box}
          displayName={displayName}
          isRunning={isRunning}
          activity={activity}
          onResume={() => doAction(() => startBox(box.id), `${displayName} back to work`)}
          className="h-[640px] xl:col-span-2"
        />
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
