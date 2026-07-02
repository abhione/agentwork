"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * How-it-works progress rail: when the section enters the viewport, adds
 * `.rail-drawn` — CSS then draws the connecting line (scaleX 0→1) and lights
 * the step icons in sequence via staggered transition delays (see globals.css
 * `.rail-line` / `.rail-step`). Children stay server-rendered.
 */
export function ProgressRail({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("rail-drawn");
            io.disconnect();
          }
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -60px 0px" }
    );
    io.observe(el);
    // Failsafe: never leave the rail dim (mirrors reveal.tsx behavior)
    const failsafe = window.setTimeout(() => {
      el.classList.add("rail-drawn");
      io.disconnect();
    }, 3000);
    return () => {
      window.clearTimeout(failsafe);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={cn("rail", className)}>
      {children}
    </div>
  );
}
