"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSafeRedirectPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("error") === "auth_callback_failed"
      ? "Google sign-in could not be completed. Please try again."
      : null;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  function getPostLoginPath() {
    if (typeof window === "undefined") return "/";
    return getSafeRedirectPath(new URLSearchParams(window.location.search).get("next"));
  }

  async function handleGoogleSignIn() {
    setError(null);
    setMessage(null);
    setIsLoading(true);
    const supabase = createClient();

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", getPostLoginPath());

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) throw new Error("Could not start Google sign-in. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);
    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw new Error("Could not create account. Check the details and try again.");
        setMessage("Account created. Check your email to confirm, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Invalid email or password.");
        router.push(getPostLoginPath());
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
                    maxLength={254}
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
                    minLength={8}
                    maxLength={256}
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

              <div className="my-5 flex items-center gap-3 text-xs font-black uppercase tracking-wide text-muted">
                <span className="h-px flex-1 bg-line" />
                <span>or</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <Button
                type="button"
                variant="secondary"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                className="w-full"
              >
                <GoogleIcon />
                Continue with Google
              </Button>

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

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.26Z"
      />
      <path
        fill="#34A853"
        d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.74 9.74 0 0 0 12 21.5Z"
      />
      <path
        fill="#FBBC05"
        d="M6.53 13.58A5.86 5.86 0 0 1 6.22 12c0-.55.1-1.08.31-1.58V7.89H3.29A9.48 9.48 0 0 0 2.25 12c0 1.48.35 2.88 1.04 4.11l3.24-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.39c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.49 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.71 5.39l3.24 2.53C7.3 8.11 9.46 6.39 12 6.39Z"
      />
    </svg>
  );
}
