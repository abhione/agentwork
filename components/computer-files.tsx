"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUp, FileText, Folder, Loader2, RefreshCw } from "lucide-react";
import { execInBox } from "@/lib/boxclaws";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WORKSPACE = "$HOME/.openclaw/workspace";
const PREVIEW_BYTES = "20000";

/** Reject path segments that could escape the workspace or break quoting. */
function safeRel(path: string): boolean {
  return !path
    .split("/")
    .some((seg) => seg === ".." || /["$`\\]/.test(seg));
}

/**
 * Browser for the agent's workspace directory inside the box — real listing
 * and file previews via the exec endpoint.
 */
export function ComputerFiles({ boxId, enabled }: { boxId: string; enabled: boolean }) {
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ file: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(
    async (rel: string) => {
      if (!enabled || !safeRel(rel)) return;
      setLoading(true);
      setError(null);
      setPreview(null);
      try {
        const { stdout, stderr } = await execInBox(boxId, [
          "sh",
          "-c",
          `cd "${WORKSPACE}/${rel}" 2>/dev/null && ls -Ap || echo "__ERR__" >&2`,
        ]);
        if (stderr.includes("__ERR__")) throw new Error("Directory not found");
        setEntries(stdout.split("\n").filter(Boolean));
        setPath(rel);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [boxId, enabled]
  );

  const open = async (name: string) => {
    const rel = path ? `${path}/${name}` : name;
    if (name.endsWith("/")) {
      void list(rel.replace(/\/$/, ""));
      return;
    }
    if (!safeRel(rel)) return;
    setLoading(true);
    try {
      const { stdout } = await execInBox(boxId, [
        "sh",
        "-c",
        `head -c ${PREVIEW_BYTES} "${WORKSPACE}/${rel}"`,
      ]);
      setPreview({ file: rel, text: stdout });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) void list("");
  }, [enabled, list]);

  if (!enabled) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Agent is paused — resume to browse its workspace.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={!path && !preview}
          onClick={() => {
            if (preview) setPreview(null);
            else void list(path.split("/").slice(0, -1).join("/"));
          }}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <span className="flex-1 truncate font-mono text-[11px] text-muted-foreground">
          workspace/{preview ? preview.file : path}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => void list(path)}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
      </div>
      <div className="chat-scroll flex-1 overflow-y-auto p-2">
        {error && <p className="px-2 py-1 text-xs text-red-400">{error}</p>}
        {preview ? (
          <pre className="whitespace-pre-wrap p-2 font-mono text-[11px] text-zinc-300">
            {preview.text || "(empty or binary file)"}
          </pre>
        ) : entries.length === 0 && !loading ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">Empty directory</p>
        ) : (
          entries.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => void open(name)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/[0.04]"
            >
              {name.endsWith("/") ? (
                <Folder className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
              ) : (
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate font-mono">{name.replace(/\/$/, "")}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
