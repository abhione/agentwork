"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

const linkBase =
  "rounded-md px-3 py-2 text-sm font-medium transition-colors";

export function AuthedNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/marketplace"
      ? pathname === "/marketplace" || pathname.startsWith("/talent") || pathname.startsWith("/interview")
      : pathname.startsWith(href);

  return (
    <>
      <Link
        href="/marketplace"
        className={cn(
          linkBase,
          isActive("/marketplace")
            ? "bg-secondary/80 text-foreground"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        )}
      >
        Find Talent
      </Link>
      <Link
        href="/team"
        className={cn(
          linkBase,
          "flex items-center gap-1.5",
          isActive("/team")
            ? "bg-secondary/80 text-foreground"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        )}
      >
        <Users className="h-4 w-4" />
        Your Team
      </Link>
    </>
  );
}
