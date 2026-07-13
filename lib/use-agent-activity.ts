"use client";

import { useEffect, useRef, useState } from "react";
import type { ActivitySnapshot } from "@/lib/agent-activity";

/**
 * Polls the live activity feed for a box. Polls faster while a chat turn is
 * in flight (`fast`) so the computer panel visibly tracks the agent working.
 */
export function useAgentActivity(
  boxId: string,
  opts: { enabled: boolean; fast?: boolean }
): ActivitySnapshot & { loaded: boolean } {
  const [snapshot, setSnapshot] = useState<ActivitySnapshot>({
    events: [],
    currentTool: null,
  });
  const [loaded, setLoaded] = useState(false);
  const inFlight = useRef(false);

  const { enabled, fast } = opts;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const poll = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch(`/api/box-activity/${encodeURIComponent(boxId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as ActivitySnapshot;
        if (!cancelled) {
          setSnapshot(data);
          setLoaded(true);
        }
      } catch {
        // transient poll failures are fine; next tick retries
      } finally {
        inFlight.current = false;
      }
    };

    poll();
    const interval = setInterval(poll, fast ? 2_500 : 6_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [boxId, enabled, fast]);

  return { ...snapshot, loaded };
}
