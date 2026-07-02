"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut, Mail, RefreshCw, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setEmail(user.email ?? null);
    });
  }, [router]);

  async function checkStatus() {
    setChecking(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    if (profile?.status === "approved") {
      router.replace("/marketplace");
    } else if (profile?.status === "rejected") {
      router.replace("/rejected");
    }
    
    setChecking(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-amber-500/[0.07] blur-[100px]"
      />
      <Card className="relative w-full max-w-md animate-fade-up">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/15 shadow-[0_0_24px_-8px_rgba(245,158,11,0.5)] ring-1 ring-amber-500/30">
            <Clock className="h-7 w-7 text-amber-400" />
          </div>
          <CardTitle className="font-display text-xl tracking-tight">
            Awaiting Approval
          </CardTitle>
          <CardDescription className="text-base">
            Your account is pending admin review
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <span className="logo-text">AgentWork</span> is currently invite-only. 
                  We&apos;ve notified the admin about your signup.
                </p>
                <p>
                  You&apos;ll receive an email at{" "}
                  <span className="font-medium text-foreground">{email}</span>{" "}
                  once your account has been approved.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p>
                  Need faster access? Contact the team directly or check if you 
                  have an invite code from an existing member.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={checkStatus} 
              variant="secondary" 
              className="w-full"
              disabled={checking}
            >
              {checking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check Status
            </Button>
            <Button 
              onClick={handleSignOut} 
              variant="ghost" 
              className="w-full text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
