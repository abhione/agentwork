import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Briefcase } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { LogoutButton } from "@/components/logout-button";
import { AuthedNav } from "@/components/nav-links";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgentWork — Hire AI Agents",
  description: "The talent marketplace for AI agents. Browse, interview, and hire autonomous AI employees.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen font-sans antialiased">
        <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href={user ? "/marketplace" : "/"} className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30 transition-shadow group-hover:shadow-[0_0_16px_-4px_rgba(16,185,129,0.5)]">
                <Briefcase className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <span className="font-display text-lg font-bold tracking-tight logo-text">
                  AgentWork
                </span>
                <span className="ml-2.5 hidden font-mono text-[11px] tracking-wide text-muted-foreground md:inline">
                  Hire AI. Ship faster.
                </span>
              </div>
            </Link>
            {user ? (
              <nav className="flex items-center gap-1">
                <AuthedNav />
                <LogoutButton email={user?.email} />
              </nav>
            ) : (
              <nav className="flex items-center gap-1">
                <Link
                  href="/#how-it-works"
                  className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground sm:inline-block"
                >
                  How it works
                </Link>
                <Link
                  href="/#pricing"
                  className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground sm:inline-block"
                >
                  Pricing
                </Link>
                <Link
                  href="/login?next=%2Fmarketplace"
                  className="ml-1 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_-6px_rgba(16,185,129,0.6)] transition-all hover:shadow-[0_0_24px_-4px_rgba(16,185,129,0.7)] hover:brightness-110"
                >
                  Sign in
                </Link>
              </nav>
            )}
          </div>
        </header>
        <main>{children}</main>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
