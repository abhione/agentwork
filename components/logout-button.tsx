"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ email }: { email?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/login") return null;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut().catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {email && (
        <span className="hidden max-w-[16rem] truncate text-xs text-muted-foreground md:inline" title={email}>
          {email}
        </span>
      )}
      <button
        onClick={handleLogout}
        title="Log out"
        className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Log out</span>
      </button>
    </div>
  );
}
