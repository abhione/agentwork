"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Mail, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RejectedPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setEmail(user.email ?? null);

      // Fetch rejection reason
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("rejected_reason")
        .eq("id", user.id)
        .single();
      
      setReason(profile?.rejected_reason ?? null);
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-red-500/[0.07] blur-[100px]"
      />
      <Card className="relative w-full max-w-md animate-fade-up">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/15 shadow-[0_0_24px_-8px_rgba(239,68,68,0.5)] ring-1 ring-red-500/30">
            <XCircle className="h-7 w-7 text-red-400" />
          </div>
          <CardTitle className="font-display text-xl tracking-tight">
            Access Denied
          </CardTitle>
          <CardDescription className="text-base">
            Your account request was not approved
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {reason && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Reason:</span> {reason}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p>
                  If you believe this is an error, please contact the admin team 
                  with your email address: {" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSignOut} 
            variant="secondary" 
            className="w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
