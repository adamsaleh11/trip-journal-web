"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  MapPin,
  RotateCw,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { TripTravelersSection } from "@/components/trips/trip-travelers-section";
import { ManualPlansSection } from "@/components/trips/manual-plans-section";
import { CategoryPanelsSection } from "@/components/trips/category-panels-section";
import { GenerationSection } from "@/components/trips/generation-section";
import { JournalSection } from "@/components/trips/journal-section";
import { RightNowTripCard } from "@/components/right-now/right-now-trip-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import {
  completeTrip,
  getPreferenceStatus,
  getTrip,
  listJournalEntries,
  listMembers,
  listParticipants,
  listManualPlans,
} from "@/lib/api/trips";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import type {
  CompletionEntry,
  JournalEntry,
  Member,
  Participant,
  Trip,
  ManualPlan,
} from "@/lib/api/types";
import { PreferencesSection } from "@/components/preferences/preferences-section";

type DetailState =
  | { status: "loading" }
  | { status: "forbidden" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      trip: Trip;
      members: Member[];
      participants: Participant[];
      completions: CompletionEntry[];
      manualPlans: ManualPlan[];
      journalEntries: JournalEntry[];
      journalError: string | null;
    };

const statusLabel: Record<Trip["status"], string> = {
  planning: "Planning",
  generated: "Generated",
  completed: "Completed",
};

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(false);

  const loadTrip = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const acceptedParticipantId = window.sessionStorage.getItem(
        acceptedParticipantStorageKey(params.id),
      );
      const [trip, members, participants, completions, manualPlans] = await Promise.all([
        getTrip(params.id),
        listMembers(params.id),
        listParticipants(params.id),
        getPreferenceStatus(params.id),
        listManualPlans(params.id),
      ]);
      let journalEntries: JournalEntry[] = [];
      let journalError: string | null = null;
      if (trip.status === "completed") {
        try {
          journalEntries = await listJournalEntries(params.id);
        } catch (journalLoadError) {
          journalError =
            journalLoadError instanceof Error
              ? journalLoadError.message
              : "Unable to load journal.";
        }
      }
      if (acceptedParticipantId) {
        window.sessionStorage.removeItem(acceptedParticipantStorageKey(params.id));
        const [refetchedParticipants, refetchedCompletions] = await Promise.all([
          listParticipants(params.id),
          getPreferenceStatus(params.id),
        ]);
        setState({
          status: "ready",
          trip,
          members,
          participants: refetchedParticipants,
          completions: refetchedCompletions,
          manualPlans,
          journalEntries,
          journalError,
        });
        return;
      }
      setState({
        status: "ready",
        trip,
        members,
        participants,
        completions,
        manualPlans,
        journalEntries,
        journalError,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setState({ status: "forbidden" });
        return;
      }
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to load trip.",
      });
    }
  }, [params.id]);

  useEffect(() => {
    void loadTrip();
  }, [loadTrip]);

  useEffect(() => {
    function handleWhimSaved(event: Event) {
      const detail = (event as CustomEvent<{ tripId?: string }>).detail;
      if (detail?.tripId === params.id) {
        void loadTrip();
      }
    }

    window.addEventListener("trip-journal:journal-updated", handleWhimSaved);
    return () => window.removeEventListener("trip-journal:journal-updated", handleWhimSaved);
  }, [loadTrip, params.id]);

  if (state.status === "loading") {
    return <TripDetailSkeleton />;
  }

  if (state.status === "forbidden") {
    return (
      <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-6">
        <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold">You do not have access</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          This trip belongs to another group. Ask an admin for a fresh invite link.
        </p>
        <Button asChild className="mt-5" variant="secondary">
          <Link href="/trips">Back to trips</Link>
        </Button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-6">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold">Trip could not load</h1>
        <p className="mt-2 text-muted-foreground">{state.message}</p>
        <Button className="mt-5" variant="secondary" onClick={loadTrip}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  const isAdmin = state.members.some(
    (member) => member.uid === user?.uid && member.role === "admin",
  );
  const isGenerated =
    state.trip.status === "generated" || state.trip.status === "completed";

  async function handleCompleteTrip() {
    if (state.status !== "ready") return;

    setCompletingTrip(true);
    try {
      await completeTrip(state.trip.id);
      setCompleteConfirmOpen(false);
      toast({
        kind: "success",
        title: "Trip completed",
        description: "Journal stops are ready for members.",
      });
      await loadTrip();
    } catch (error) {
      toast({
        kind: "error",
        title: "Trip could not be completed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setCompletingTrip(false);
    }
  }

  function handleJournalEntrySaved(updatedEntry: JournalEntry) {
    setState((current) => {
      if (current.status !== "ready") return current;
      return {
        ...current,
        journalEntries: current.journalEntries.map((entry) =>
          entry.placeId === updatedEntry.placeId ? updatedEntry : entry,
        ),
      };
    });
  }

  const generationSection = (
    <GenerationSection
      tripId={state.trip.id}
      participants={state.participants}
      completions={state.completions}
      manualPlans={state.manualPlans}
      isAdmin={isAdmin}
    />
  );

  const planningTools = (
    <div className="space-y-6">
      {state.trip.status !== "completed" ? (
        <RightNowTripCard
          tripId={state.trip.id}
          destinationText={state.trip.destination.text}
        />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <TripTravelersSection
          tripId={state.trip.id}
          participants={state.participants}
          isAdmin={isAdmin}
          onParticipantsChanged={loadTrip}
        />

        <PreferencesSection
          tripId={state.trip.id}
          participants={state.participants}
          members={state.members}
          currentUid={user?.uid}
        />
      </section>

      {state.trip.status !== "completed" && (
        <ManualPlansSection
          tripId={state.trip.id}
          manualPlans={state.manualPlans}
          isAdmin={isAdmin}
          onManualPlansChanged={loadTrip}
          tripStartDate={state.trip.startDate}
          tripEndDate={state.trip.endDate}
        />
      )}

      {state.trip.status !== "completed" && (
        <CategoryPanelsSection tripId={state.trip.id} isAdmin={isAdmin} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card/80 p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <Badge variant={state.trip.status === "completed" ? "success" : "secondary"}>
              {statusLabel[state.trip.status]}
            </Badge>
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight">
              {state.trip.name}
            </h1>
            <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
                {state.trip.destination.text}
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                {formatDate(state.trip.startDate)} - {formatDate(state.trip.endDate)}
              </span>
            </div>
            {state.trip.lodgingArea ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Staying around {state.trip.lodgingArea}
              </p>
            ) : null}
          </div>
          {isAdmin && state.trip.status === "generated" ? (
            <Button
              type="button"
              className="w-full md:w-auto"
              onClick={() => setCompleteConfirmOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Complete trip
            </Button>
          ) : null}
        </div>
      </section>

      {state.trip.status === "completed" ? (
        <>
          <JournalSection
            tripId={state.trip.id}
            entries={state.journalEntries}
            error={state.journalError}
            onRetry={loadTrip}
            onEntrySaved={handleJournalEntrySaved}
            onSharedStateChanged={loadTrip}
          />
          {generationSection}
          <details className="group rounded-lg border border-border bg-card/50 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground">
              Planning details
            </summary>
            <div className="mt-4">{planningTools}</div>
          </details>
        </>
      ) : isGenerated ? (
        <>
          {generationSection}
          <details className="group rounded-lg border border-border bg-card/50 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground">
              Planning details
            </summary>
            <div className="mt-4">{planningTools}</div>
          </details>
        </>
      ) : (
        <>
          {planningTools}
          {generationSection}
        </>
      )}

      <Dialog open={completeConfirmOpen} onOpenChange={setCompleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete this trip?</DialogTitle>
            <DialogDescription>
              This moves it to your journal. Members can rate stops, write private notes, and choose whether to share anonymized tips.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCompleteConfirmOpen(false)}
              disabled={completingTrip}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCompleteTrip} disabled={completingTrip}>
              {completingTrip ? "Completing..." : "Complete trip"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



function TripDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card/80 p-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-5 h-12 w-3/4" />
        <Skeleton className="mt-4 h-5 w-2/3" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function acceptedParticipantStorageKey(tripId: string) {
  return `trip-journal-accepted-participant:${tripId}`;
}
