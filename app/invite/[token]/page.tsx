"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, LogIn, MapPin, RotateCw } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { acceptInvite, getInvitePreview } from "@/lib/api/trips";
import type { InvitePreview } from "@/lib/api/types";

type InviteState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "ready"; preview: InvitePreview };

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<InviteState>({ status: "loading" });
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const loadInvite = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const preview = await getInvitePreview(params.token);
      setState({ status: "ready", preview });
    } catch (error) {
      setState({
        status: "invalid",
        message:
          error instanceof ApiError && error.status === 404
            ? "This invite link is invalid or no longer exists."
            : error instanceof Error
              ? error.message
              : "Unable to load invite.",
      });
    }
  }, [params.token]);

  useEffect(() => {
    window.sessionStorage.setItem("trip-journal-pending-invite", params.token);
    void loadInvite();
  }, [loadInvite, params.token]);

  async function handleAccept() {
    setAccepting(true);
    setAcceptError(null);
    try {
      const accepted = await acceptInvite(params.token);
      window.sessionStorage.removeItem("trip-journal-pending-invite");
      if (accepted.participantId) {
        window.sessionStorage.setItem(
          `trip-journal-accepted-participant:${accepted.tripId}`,
          accepted.participantId,
        );
      }
      toast({ kind: "success", title: "Joined trip" });
      router.replace(`/trips/${accepted.tripId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 410) {
        setAcceptError("This invite was already used.");
      } else {
        setAcceptError(error instanceof Error ? error.message : "Unable to join trip.");
      }
    } finally {
      setAccepting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="w-full max-w-xl rounded-lg border border-border bg-card/90 p-5 shadow-2xl sm:p-7">
        {state.status === "loading" ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-12 w-4/5" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}

        {state.status === "invalid" ? (
          <div>
            <AlertCircle className="h-9 w-9 text-destructive" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-semibold">Invite unavailable</h1>
            <p className="mt-2 text-muted-foreground">{state.message}</p>
            <Button className="mt-5" variant="secondary" onClick={loadInvite}>
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <div>
            <Badge variant={state.preview.status === "pending" ? "secondary" : "outline"}>
              {state.preview.status === "pending" ? "Invite pending" : "Invite used"}
            </Badge>
            <h1 className="mt-5 font-serif text-4xl font-semibold">
              Join {state.preview.tripName}
            </h1>
            <p className="mt-3 flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
              {state.preview.destinationText}
            </p>
            {state.preview.inviterName ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Invited by {state.preview.inviterName}
              </p>
            ) : null}

            {state.preview.status !== "pending" ? (
              <div className="mt-6 rounded-md border border-border bg-muted/35 p-3">
                This invite has already been accepted.
              </div>
            ) : authLoading ? (
              <Button className="mt-6 w-full" disabled>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Checking sign-in
              </Button>
            ) : user ? (
              <Button className="mt-6 w-full" onClick={handleAccept} disabled={accepting}>
                {accepting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                Join {state.preview.tripName}
              </Button>
            ) : (
              <Button asChild className="mt-6 w-full">
                <Link href={`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`}>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Sign in to join
                </Link>
              </Button>
            )}

            {acceptError ? (
              <p className="mt-4 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                {acceptError}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
