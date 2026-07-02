"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, KeyRound, Loader2, MailCheck, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Invalid email or password.";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("already registered")) return "That email is already registered. Try signing in.";
  if (m.includes("password should be")) return message;
  return message || "Something went wrong. Try again.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  function nextPath(): string {
    const next = searchParams.get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/marketplace";
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setConfirm("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(friendlyError(error.message));
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`,
          },
        });
        if (error) {
          setError(friendlyError(error.message));
          return;
        }
        // No session ⇒ email confirmation is required
        if (!data.session) {
          setAwaitingConfirm(true);
          return;
        }
      }
      router.replace(nextPath());
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (awaitingConfirm) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 sm:px-6">
        <Card className="w-full max-w-sm animate-fade-up">
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <MailCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to <span className="text-foreground">{email}</span>.
              Click it to activate your account, then sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setAwaitingConfirm(false);
                switchMode("signin");
              }}
            >
              Back to sign in
            </Button>
          </CardContent>
        </Card>
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
            <Briefcase className="h-6 w-6 text-emerald-400" />
          </div>
          <CardTitle className="font-display text-xl tracking-tight">
            {mode === "signin" ? "Sign in to" : "Join"} <span className="logo-text">AgentWork</span>
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Enter your email and password to continue."
              : "Create an account with your email and a password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive-foreground" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "signin" ? (
                <KeyRound className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-medium text-emerald-400 hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="font-medium text-emerald-400 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
