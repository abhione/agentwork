"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  Monitor,
  MessageSquare,
  Pause,
  Play,
  Trash2,
  RefreshCw,
  ServerOff,
  Plus,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TalentAvatar } from "@/components/talent-avatar";
import { listBoxes, startBox, stopBox, destroyBox, checkHealth, type BoxRecord } from "@/lib/boxclaws";
import { getHires } from "@/lib/hires";
import { getTalent, formatRate, type Talent } from "@/lib/talents";
import { cn } from "@/lib/utils";

interface TeamMember {
  box: BoxRecord;
  talent?: Talent;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const up = await checkHealth();
    setApiUp(up);
    if (!up) {
      setLoading(false);
      return;
    }
    try {
      const boxes = await listBoxes();
      const hires = getHires();
      setMembers(
        boxes.map((box) => {
          const hire = hires.find((h) => h.boxId === box.id);
          // fall back to persona match if no explicit hire record
          const talent = hire
            ? getTalent(hire.talentId)
            : undefined;
          return { box, talent };
        })
      );
    } catch (err) {
      toast.error(`Failed to load team: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const action = async (id: string, fn: () => Promise<void>, msg: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(msg);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const running = members.filter((m) => m.box.state === "running").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-bold tracking-[-0.02em]">
            <Users className="h-6 w-6 text-emerald-400" /> Your Team
          </h1>
          <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
            {members.length} agent{members.length === 1 ? "" : "s"} hired · {running} working now
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/marketplace">
              <Plus className="h-3.5 w-3.5" /> Hire More Talent
            </Link>
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your team…
        </div>
      )}

      {!loading && apiUp === false && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ServerOff className="h-10 w-10 text-amber-400" />
            <h2 className="text-lg font-semibold">Box Claws infrastructure offline</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              The Box Claws API isn&apos;t reachable at{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5">localhost:3457</code>. Start it
              from the agentbox-openclaw repo to see and manage your hired agents.
            </p>
            <code className="rounded-lg bg-secondary px-4 py-2 text-xs">
              cd ~/Developer/agentbox-openclaw && ./start.sh
            </code>
          </CardContent>
        </Card>
      )}

      {!loading && apiUp && members.length === 0 && (
        <Card className="border-dashed border-white/10">
          <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Users className="h-7 w-7 text-emerald-400/70" />
            </div>
            <h2 className="text-lg font-semibold">No hires yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Browse the marketplace, interview a few agents, and hire your first AI employee.
            </p>
            <Button asChild className="mt-2">
              <Link href="/marketplace">Browse Talent</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {members.map(({ box, talent }) => {
          const isRunning = box.state === "running";
          const isBusy = busy === box.id;
          return (
            <Card
              key={box.id}
              className={cn(
                "transition-all duration-300 hover:-translate-y-0.5",
                isRunning &&
                  "border-emerald-500/30 shadow-[0_0_32px_-12px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]"
              )}
            >
              <CardContent className="p-5">
                <Link href={`/team/${box.id}`} className="block">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <TalentAvatar id={talent?.id || box.id} emoji={talent?.emoji || "🤖"} />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
                          isRunning ? "bg-emerald-400 animate-pulse-ring" : "bg-zinc-500"
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{talent?.name || box.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {talent?.role || box.config?.persona || "Custom Agent"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            isRunning && "bg-emerald-500/15 text-emerald-300"
                          )}
                        >
                          {isRunning ? "● Working" : box.state === "stopped" ? "Paused" : box.state}
                        </Badge>
                        {talent && (
                          <span className="font-mono text-xs text-emerald-400">
                            {formatRate(talent.hourlyRate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* VNC thumbnail */}
                  <div className="mt-4 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black/50">
                    {isRunning && box.ports?.novnc ? (
                      <iframe
                        src={`http://localhost:${box.ports.novnc}/vnc.html?autoconnect=true&resize=scale&view_only=true`}
                        className="pointer-events-none h-full w-full origin-top-left"
                        title={`${box.name} screen`}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        <Monitor className="mr-2 h-4 w-4" />
                        {isRunning ? "Screen unavailable" : "Agent paused"}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="mt-4 flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
                    <Link href={`/team/${box.id}`}>
                      <MessageSquare className="h-3.5 w-3.5" /> Manage
                    </Link>
                  </Button>
                  {isRunning ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => action(box.id, () => stopBox(box.id), `${talent?.name || box.name} paused`)}
                      className="gap-1.5"
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                      Pause
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => action(box.id, () => startBox(box.id), `${talent?.name || box.name} back to work`)}
                      className="gap-1.5"
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => {
                      if (confirm(`Terminate ${talent?.name || box.name}? This destroys their workspace.`)) {
                        action(box.id, () => destroyBox(box.id), "Contract ended");
                      }
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
