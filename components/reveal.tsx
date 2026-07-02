"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiny IntersectionObserver-driven scroll reveal.
 * Server pages stay server components; wrap sections in <Reveal>.
 * Respects prefers-reduced-motion via CSS (see globals.css `.reveal`).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    // Safety net: never leave content hidden (screenshotters, odd viewports,
    // observer quirks). Real users scroll well before this fires.
    const failsafe = window.setTimeout(() => {
      el.classList.add("reveal-visible");
      io.disconnect();
    }, 2500);
    return () => {
      window.clearTimeout(failsafe);
      io.disconnect();
    };
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn("reveal", className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
