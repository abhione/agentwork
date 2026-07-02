import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ModelTier } from "@/lib/talents";

/**
 * Tier-coded avatar system.
 *
 * Tier = visual identity: slate/silver → haiku, emerald → sonnet,
 * violet → opus, gold → fable. Every avatar carries a tier-colored
 * gradient ring; agents with a generated portrait render it inside the
 * ring, the rest get a deep layered tile in the tier hue (no more
 * name-hash random gradients).
 */

type TierStyle = {
  /** gradient ring (outer p-px wrapper) */
  ring: string;
  /** layered tile behind the emoji */
  tile: string;
  /** soft glow accent inside the tile */
  glow: string;
};

const TIER_STYLES: Record<ModelTier, TierStyle> = {
  haiku: {
    ring: "from-slate-300/50 via-slate-500/25 to-slate-700/10",
    tile: "from-slate-400/[0.16] via-slate-600/[0.10] to-slate-950/60",
    glow: "bg-slate-300/[0.14]",
  },
  sonnet: {
    ring: "from-emerald-300/50 via-emerald-500/25 to-emerald-800/10",
    tile: "from-emerald-400/[0.16] via-emerald-600/[0.10] to-emerald-950/60",
    glow: "bg-emerald-300/[0.14]",
  },
  opus: {
    ring: "from-violet-300/50 via-violet-500/25 to-violet-800/10",
    tile: "from-violet-400/[0.16] via-violet-600/[0.10] to-violet-950/60",
    glow: "bg-violet-300/[0.14]",
  },
  fable: {
    ring: "from-amber-200/60 via-amber-400/30 to-amber-700/10",
    tile: "from-amber-300/[0.18] via-amber-500/[0.10] to-amber-950/60",
    glow: "bg-amber-200/[0.16]",
  },
};

/** Neutral style for boxes with no linked talent profile. */
const NEUTRAL_STYLE: TierStyle = {
  ring: "from-white/25 via-white/10 to-white/[0.03]",
  tile: "from-white/[0.10] via-white/[0.05] to-black/40",
  glow: "bg-white/[0.08]",
};

const SIZES = {
  sm: { box: "h-10 w-10", text: "text-xl", px: 40 },
  md: { box: "h-14 w-14", text: "text-3xl", px: 56 },
  lg: { box: "h-20 w-20", text: "text-4xl", px: 80 },
  xl: { box: "h-28 w-28", text: "text-6xl", px: 112 },
} as const;

export function TalentAvatar({
  id,
  emoji,
  tier,
  avatar,
  name,
  size = "md",
  className,
}: {
  id: string;
  emoji: string;
  tier?: ModelTier;
  avatar?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const style = tier ? TIER_STYLES[tier] : NEUTRAL_STYLE;
  const s = SIZES[size];

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-2xl bg-gradient-to-br p-px",
        style.ring,
        s.box,
        className
      )}
    >
      {avatar ? (
        <div className="relative h-full w-full overflow-hidden rounded-[calc(1rem-1px)] bg-black/60">
          <Image
            src={avatar}
            alt={name ? `${name} — AI agent portrait` : "AI agent portrait"}
            fill
            sizes={`${s.px}px`}
            className="object-cover"
          />
          {/* inner top highlight to match surface-card finish */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[calc(1rem-1px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
          />
        </div>
      ) : (
        <div
          className={cn(
            "relative flex h-full w-full items-center justify-center overflow-hidden rounded-[calc(1rem-1px)] bg-gradient-to-br",
            style.tile,
            s.text
          )}
        >
          {/* soft tier glow behind the emoji */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute -top-1/4 left-1/2 h-3/4 w-3/4 -translate-x-1/2 rounded-full blur-lg",
              style.glow
            )}
          />
          {/* inner top highlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[calc(1rem-1px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          />
          <span className="relative drop-shadow-sm">{emoji}</span>
        </div>
      )}
    </div>
  );
}
