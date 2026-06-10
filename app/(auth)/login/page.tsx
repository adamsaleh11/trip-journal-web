"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { useSearchParams, useRouter } from "next/navigation";
import { Compass, Loader2, Mail, MapPinned } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "signin" | "signup";

const authErrorMessages: Record<string, string> = {
  "auth/email-already-in-use": "That email already has an account. Sign in instead.",
  "auth/invalid-credential": "The email or password does not match an account.",
  "auth/user-not-found": "No account exists for that email.",
  "auth/wrong-password": "The password is incorrect.",
  "auth/weak-password": "Use at least six characters for your password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/popup-closed-by-user": "The Google sign-in window was closed before finishing.",
  "auth/configuration-not-found":
    "Firebase Auth is not enabled for this project yet. Check the Firebase console provider settings.",
};

function getAuthMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    return authErrorMessages[error.code] ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to complete sign-in. Try again.";
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="h-10 w-10 animate-pulse rounded-md bg-primary/25" />
    </main>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, configError, signInWithEmail, signUpWithEmail, signInWithGoogle } =
    useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"email" | "google" | null>(
    null,
  );

  const destination = useMemo(() => {
    const next = searchParams.get("next");
    return next?.startsWith("/") ? next : "/trips";
  }, [searchParams]);

  useEffect(() => {
    if (!loading && user) {
      router.replace(destination);
    }
  }, [destination, loading, router, user]);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPendingAction("email");

    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      router.replace(destination);
    } catch (authError) {
      setError(getAuthMessage(authError));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setPendingAction("google");

    try {
      await signInWithGoogle();
      router.replace(destination);
    } catch (authError) {
      setError(getAuthMessage(authError));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-between gap-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="max-w-2xl py-8">
          <div className="mb-10 inline-flex h-11 w-11 items-center justify-center rounded-md border border-primary/30 bg-primary/15 text-primary shadow-glow">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.24em] text-primary">
            Trip Journal
          </p>
          <h1 className="font-serif text-5xl font-semibold leading-tight text-foreground sm:text-6xl">
            Plans, preferences, and the trip story in one shared atlas.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Build a shared itinerary with friends, then turn the places you loved
            into a private journal map.
          </p>
          <div className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="rounded-md border border-border bg-card/60 p-4">
              <MapPinned className="mb-3 h-5 w-5 text-accent" aria-hidden="true" />
              Journal-style trip cards, member preferences, and map memories.
            </div>
            <div className="rounded-md border border-border bg-card/60 p-4">
              <Mail className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
              Sign in now; invite and generation flows plug in as the API lands.
            </div>
          </div>
        </section>

        <section className="w-full rounded-lg border border-border bg-card/90 p-5 shadow-2xl shadow-black/30 sm:p-7">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">
              {mode === "signin" ? "Sign in" : "Create account"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Continue to your trip workspace.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-md border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className="rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:bg-background data-[active=true]:text-foreground"
              data-active={mode === "signin"}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className="rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:bg-background data-[active=true]:text-foreground"
              data-active={mode === "signup"}
            >
              Sign up
            </button>
          </div>

          <Button
            className="w-full"
            variant="secondary"
            onClick={handleGoogleSignIn}
            disabled={loading || pendingAction !== null || Boolean(configError)}
          >
            {pendingAction === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            Email
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>

            {configError ? (
              <p
                className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
                role="alert"
              >
                {configError}
              </p>
            ) : null}

            {error ? (
              <p
                className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || pendingAction !== null || Boolean(configError)}
            >
              {pendingAction === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
