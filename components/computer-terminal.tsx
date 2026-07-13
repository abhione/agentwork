"use client";

import { useRef, useState } from "react";
import { Loader2, TerminalSquare } from "lucide-react";
import { execInBox } from "@/lib/boxclaws";

interface TermEntry {
  cmd: string;
  out: string;
  err?: string;
}

/**
 * Real shell into the agent's box via the exec endpoint. Each command runs a
 * fresh non-interactive shell in the box (no persistent cwd/session).
 */
export function ComputerTerminal({ boxId, enabled }: { boxId: string; enabled: boolean }) {
  const [entries, setEntries] = useState<TermEntry[]>([]);
  const [cmd, setCmd] = useState("");
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const run = async () => {
    const command = cmd.trim();
    if (!command || running || !enabled) return;
    setCmd("");
    setRunning(true);
    try {
      const { stdout, stderr } = await execInBox(boxId, ["sh", "-c", command]);
      setEntries((prev) => [...prev, { cmd: command, out: stdout, err: stderr }]);
    } catch (err) {
      setEntries((prev) => [
        ...prev,
        { cmd: command, out: "", err: err instanceof Error ? err.message : String(err) },
      ]);
    } finally {
      setRunning(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
      );
    }
  };

  return (
    <div className="flex h-full flex-col bg-black/50 font-mono text-xs">
      <div ref={scrollRef} className="chat-scroll flex-1 space-y-2 overflow-y-auto p-3">
        {entries.length === 0 && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <TerminalSquare className="h-3.5 w-3.5" />
            {enabled
              ? "Run a command inside the agent's box (fresh shell per command)."
              : "Agent is paused — resume to use the terminal."}
          </p>
        )}
        {entries.map((e, i) => (
          <div key={i}>
            <p className="text-emerald-300">$ {e.cmd}</p>
            {e.out && <pre className="whitespace-pre-wrap text-zinc-300">{e.out}</pre>}
            {e.err && <pre className="whitespace-pre-wrap text-red-400">{e.err}</pre>}
          </div>
        ))}
        {running && (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> running…
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-border/60 px-3 py-2">
        <span className="text-emerald-300">$</span>
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
          disabled={!enabled || running}
          placeholder={enabled ? "ls ~/.openclaw/workspace" : "Agent not running"}
          className="flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
