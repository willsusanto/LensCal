"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);
    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Account created. Check your email to confirm, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-lg bg-ink text-2xl font-black text-white shadow-action">
              L
            </div>
            <p className="text-xs font-black uppercase text-blueDeep">LensCal</p>
            <h1 className="mt-3 text-5xl font-black leading-tight text-ink">
              A calmer way to keep lens replacements on time.
            </h1>
            <p className="mt-5 max-w-lg text-lg font-bold leading-8 text-muted">
              Track left and right lenses separately, review replacement history, and keep your care routine tidy.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="mb-6 lg:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ink text-xl font-black text-white">
              L
            </div>
            <h1 className="text-3xl font-black text-ink">LensCal</h1>
            <p className="mt-1 text-sm font-bold text-muted">Softlens care, made calmer.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{isSignUp ? "Create account" : "Sign in"}</CardTitle>
              <p className="text-sm font-bold text-muted">
                {isSignUp ? "Start tracking your lens routine." : "Welcome back to your lens dashboard."}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    placeholder="Password"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-dangerBg px-3 py-2 text-sm font-bold text-danger">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-lg bg-surfaceBlue px-3 py-2 text-sm font-bold text-blueDeep">
                    {message}
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
                </Button>
              </form>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsSignUp((value) => !value);
                  setError(null);
                  setMessage(null);
                }}
                className="mt-4 w-full"
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
