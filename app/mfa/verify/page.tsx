"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Shield, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function MfaVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [factorId, setFactorId] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    checkMfaFactors();
  }, []);

  async function checkMfaFactors() {
    const supabase = createClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();

    if (factors?.totp && factors.totp.length > 0) {
      const verified = factors.totp.find(f => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
      } else {
        // No verified factor, redirect to setup
        router.replace("/mfa/setup");
        return;
      }
    } else {
      // No MFA factors at all
      router.replace("/mfa/setup");
      return;
    }

    setInitializing(false);
  }

  function nextPath(): string {
    const next = searchParams.get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/marketplace";
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Create a challenge
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      setError(challengeError.message);
      setLoading(false);
      return;
    }

    // Verify the code
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError("Invalid code. Please try again.");
      setCode("");
      setLoading(false);
      return;
    }

    // Success - redirect to destination
    router.replace(nextPath());
    router.refresh();
  }

  if (initializing) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-emerald-500/[0.07] blur-[100px]"
      />
      <Card className="relative w-full max-w-sm animate-fade-up">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 shadow-[0_0_24px_-8px_rgba(16,185,129,0.5)] ring-1 ring-emerald-500/30">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <CardTitle className="font-display text-xl tracking-tight">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Enter the code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="sr-only">Verification code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                disabled={loading}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive-foreground text-center" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Verify
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MfaVerifyPage() {
  return (
    <Suspense>
      <MfaVerifyForm />
    </Suspense>
  );
}
