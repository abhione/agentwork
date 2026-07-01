import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-emerald-500/30 to-teal-600/30",
  "from-cyan-500/30 to-blue-600/30",
  "from-violet-500/30 to-purple-600/30",
  "from-amber-500/30 to-orange-600/30",
  "from-rose-500/30 to-pink-600/30",
  "from-lime-500/30 to-green-600/30",
];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function TalentAvatar({
  id,
  emoji,
  size = "md",
  className,
}: {
  id: string;
  emoji: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const gradient = GRADIENTS[hashCode(id) % GRADIENTS.length];
  const sizes = {
    sm: "h-10 w-10 text-xl",
    md: "h-14 w-14 text-3xl",
    lg: "h-20 w-20 text-4xl",
    xl: "h-28 w-28 text-6xl",
  };
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/10",
        gradient,
        sizes[size],
        className
      )}
    >
      <span className="drop-shadow-sm">{emoji}</span>
    </div>
  );
}
