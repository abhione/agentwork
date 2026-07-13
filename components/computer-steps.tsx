"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, TerminalSquare, FolderOpen, Search, MessageSquare, Users, Wrench, Loader2 } from "lucide-react";
import type { AgentEvent, ToolMode } from "@/lib/agent-activity";
import { cn } from "@/lib/utils";

const MODE_ICONS: Record<ToolMode, React.ReactNode> = {
  browser: <Globe className="h-3.5 w-3.5" />,
  terminal: <TerminalSquare className="h-3.5 w-3.5" />,
  files: <FolderOpen className="h-3.5 w-3.5" />,
  web: <Search className="h-3.5 w-3.5" />,
  message: <MessageSquare className="h-3.5 w-3.5" />,
  agent: <Users className="h-3.5 w-3.5" />,
  other: <Wrench className="h-3.5 w-3.5" />,
};

/** Manus-style step timeline: every real tool call the agent made, in order. */
export function ComputerSteps({ events, loaded }: { events: AgentEvent[]; loaded: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (stickToBottom.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [events.length]);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Reading work session…
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        No tool activity yet. Assign a task in chat and the agent&apos;s steps will appear here.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={(e) => {
        const el = e.currentTarget;
        stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      }}
      className="chat-scroll h-full overflow-y-auto px-4 py-3"
    >
      <div className="relative ml-1 space-y-3 border-l border-border/80 pl-5">
        {events.map((ev) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
            className="relative block w-full text-left"
          >
            <span
              className={cn(
                "absolute -left-[25px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background",
                ev.status === "done" && "bg-emerald-500/20 text-emerald-400",
                ev.status === "running" && "bg-cyan-500/20 text-cyan-300",
                ev.status === "error" && "bg-red-500/20 text-red-400"
              )}
            >
              {ev.status === "running" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                MODE_ICONS[ev.mode]
              )}
            </span>
            <p className="text-sm leading-snug">
              {ev.title}
              {ev.status === "error" && <span className="ml-1.5 text-xs text-red-400">failed</span>}
            </p>
            {ev.detail && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                {ev.detail}
              </p>
            )}
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">
              {new Date(ev.ts).toLocaleTimeString()}
            </p>
            {expanded === ev.id && ev.result && (
              <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-border/60 bg-black/40 p-2 font-mono text-[11px] text-muted-foreground">
                {ev.result}
              </pre>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
