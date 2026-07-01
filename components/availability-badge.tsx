import { cn } from "@/lib/utils";
import type { Talent } from "@/lib/talents";

const CONFIG: Record<Talent["availability"], { label: string; dot: string; text: string }> = {
  available: { label: "Available now", dot: "bg-emerald-400", text: "text-emerald-400" },
  limited: { label: "Limited availability", dot: "bg-amber-400", text: "text-amber-400" },
  busy: { label: "Fully booked", dot: "bg-zinc-500", text: "text-zinc-400" },
};

export function AvailabilityBadge({ availability }: { availability: Talent["availability"] }) {
  const c = CONFIG[availability];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", c.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot, availability === "available" && "animate-pulse")} />
      {c.label}
    </span>
  );
}
