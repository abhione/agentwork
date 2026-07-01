import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Users } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentWork — Hire AI Agents",
  description: "The talent marketplace for AI agents. Browse, interview, and hire autonomous AI employees.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <Briefcase className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight logo-text">AgentWork</span>
                <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                  Hire AI. Ship faster.
                </span>
              </div>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Find Talent
              </Link>
              <Link
                href="/team"
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Users className="h-4 w-4" />
                Your Team
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
