"use client";

import { useState } from "react";
import {
  ExternalLink,
  Eye,
  FolderOpen,
  ListChecks,
  Monitor,
  MousePointerClick,
  Play,
  TerminalSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComputerSteps } from "@/components/computer-steps";
import { ComputerTerminal } from "@/components/computer-terminal";
import { ComputerFiles } from "@/components/computer-files";
import { novncUrl, type BoxRecord } from "@/lib/boxclaws";
import type { ActivitySnapshot } from "@/lib/agent-activity";
import { cn } from "@/lib/utils";

type Tab = "desktop" | "terminal" | "files" | "steps";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "desktop", label: "Desktop", icon: <Monitor className="h-3.5 w-3.5" /> },
  { id: "terminal", label: "Terminal", icon: <TerminalSquare className="h-3.5 w-3.5" /> },
  { id: "files", label: "Files", icon: <FolderOpen className="h-3.5 w-3.5" /> },
  { id: "steps", label: "Steps", icon: <ListChecks className="h-3.5 w-3.5" /> },
];

interface Props {
  box: BoxRecord;
  displayName: string;
  isRunning: boolean;
  activity: ActivitySnapshot & { loaded: boolean };
  onResume: () => void;
  className?: string;
}

/**
 * Manus-style "agent's computer" panel: a live view of what the agent is
 * doing right now — its desktop (VNC), a real terminal and file browser into
 * its box, and a step timeline of every tool call, with a watch/take-control
 * toggle on the desktop view.
 */
export function AgentComputer({ box, displayName, isRunning, activity, onResume, className }: Props) {
  const [tab, setTab] = useState<Tab>("desktop");
  const [takeover, setTakeover] = useState(false);

  const firstName = displayName.split(" ")[0];
  const vnc = novncUrl(box, { scale: true });
  const { currentTool } = activity;

  const headline = !isRunning
    ? `${firstName}'s computer is paused`
    : currentTool
      ? `${firstName} is using ${currentTool.label}`
      : `${firstName}'s computer`;

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
          <Monitor className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="truncate">{headline}</span>
          {isRunning && currentTool && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          )}
        </CardTitle>
        {vnc && (
          <a
            href={vnc}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Open in new tab <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-black">
          {/* Chrome bar: tabs + live/takeover controls */}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-white/[0.03] px-2 py-1.5">
            <div className="flex items-center gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                    tab === t.id
                      ? "bg-white/[0.08] text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.icon}
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {tab === "desktop" && isRunning && (
                <button
                  type="button"
                  onClick={() => setTakeover((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ring-1 transition-colors",
                    takeover
                      ? "bg-amber-500/15 text-amber-300 ring-amber-500/40"
                      : "text-muted-foreground ring-white/[0.08] hover:text-foreground"
                  )}
                >
                  {takeover ? (
                    <>
                      <MousePointerClick className="h-3 w-3" /> In control
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" /> Take control
                    </>
                  )}
                </button>
              )}
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
          </div>

          {/* Panel body */}
          <div className="min-h-0 flex-1">
            {tab === "desktop" &&
              (isRunning && vnc ? (
                <div className="relative h-full w-full">
                  <iframe src={vnc} className="h-full w-full" title={`${displayName} desktop`} />
                  {/* Watch mode: intercept input at the panel layer so the VNC
                      URL (and connection) never changes between modes. */}
                  {!takeover && <div className="absolute inset-0 z-10" aria-hidden />}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Monitor className="h-8 w-8" />
                  <p className="text-sm">{isRunning ? "Screen unavailable" : "Agent is paused"}</p>
                  {!isRunning && (
                    <Button size="sm" variant="outline" onClick={onResume}>
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Resume work
                    </Button>
                  )}
                </div>
              ))}
            {tab === "terminal" && <ComputerTerminal boxId={box.id} enabled={isRunning} />}
            {tab === "files" && <ComputerFiles boxId={box.id} enabled={isRunning} />}
            {tab === "steps" && <ComputerSteps events={activity.events} loaded={activity.loaded} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
