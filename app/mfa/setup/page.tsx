"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, QrCode, Shield, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "loading" | "enroll" | "verify" | "complete";

export default function MfaSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  async function checkMfaStatus() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    // Check if user already has MFA enrolled
    const { data: factors } = await supabase.auth.mfa.listFactors();
    
    if (factors?.totp && factors.totp.length > 0) {
      // Already enrolled
      const verified = factors.totp.some(f => f.status === "verified");
      if (verified) {
        // Already set up, redirect to marketplace
        router.replace("/marketplace");
        return;
      }
    }

    // Start enrollment
    await startEnrollment();
  }

  async function startEnrollment() {
    const supabase = createClient();
    
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator App",
    });

    if (error) {
      setError(error.message);
      setStep("enroll");
      return;
    }

    if (data) {
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep("enroll");
    }
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
      setLoading(false);
      return;
    }

    // Update profile to mark MFA as enrolled
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_profiles")
        .update({ mfa_enrolled: true, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    setStep("complete");
    setLoading(false);

    // Redirect after showing success
    setTimeout(() => {
      router.replace("/marketplace");
    }, 2000);
  }

  if (step === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 sm:px-6">
        <Card className="w-full max-w-sm animate-fade-up">
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/15 shadow-[0_0_24px_-8px_rgba(16,185,129,0.5)] ring-1 ring-emerald-500/30">
              <CheckCircle className="h-7 w-7 text-emerald-400" />
            </div>
            <CardTitle className="text-xl">MFA Enabled!</CardTitle>
            <CardDescription>
              Your account is now protected with two-factor authentication.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-violet-500/[0.07] blur-[100px]"
      />
      <Card className="relative w-full max-w-md animate-fade-up">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/15 shadow-[0_0_24px_-8px_rgba(139,92,246,0.5)] ring-1 ring-violet-500/30">
            <ShieldCheck className="h-7 w-7 text-violet-400" />
          </div>
          <CardTitle className="font-display text-xl tracking-tight">
            Set Up Two-Factor Auth
          </CardTitle>
          <CardDescription className="text-base">
            Secure your account with an authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Scan QR code */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-medium text-violet-400">
                1
              </div>
              <div>
                <p className="font-medium">Scan this QR code</p>
                <p className="text-sm text-muted-foreground">
                  Use Google Authenticator, 1Password, Authy, or any TOTP app
                </p>
              </div>
            </div>

            {qrCode && (
              <div className="flex justify-center">
                <div className="rounded-lg bg-white p-3">
                  <img
                    src={qrCode}
                    alt="MFA QR Code"
                    className="h-40 w-40"
                  />
                </div>
              </div>
            )}

            {secret && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p className="mb-1 text-xs text-muted-foreground">
                  Can&apos;t scan? Enter this code manually:
                </p>
                <code className="break-all text-sm font-mono">{secret}</code>
              </div>
            )}
          </div>

          {/* Step 2: Enter code */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-medium text-violet-400">
                2
              </div>
              <div>
                <p className="font-medium">Enter verification code</p>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            </div>

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
                Verify & Enable MFA
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
