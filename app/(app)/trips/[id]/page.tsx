"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  MapPin,
  RotateCw,
  ShieldAlert,
} from "lucide-react";
import { TripTravelersSection } from "@/components/trips/trip-travelers-section";
import { RightNowTripCard } from "@/components/right-now/right-now-trip-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import {
  getPreferenceStatus,
  getTrip,
  listMembers,
  listParticipants,
} from "@/lib/api/trips";
import { ApiError } from "@/lib/api/client";
import type {
  CompletionEntry,
  Member,
  Participant,
  PreferenceCategory,
  Trip,
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
    };

const categories: Array<{ key: PreferenceCategory; label: string }> = [
  { key: "food_drink", label: "Food" },
  { key: "outdoors_scenic", label: "Outdoors" },
  { key: "nightlife", label: "Nightlife" },
  { key: "culture_local", label: "Culture" },
  { key: "logistics", label: "Logistics" },
];

const statusLabel: Record<Trip["status"], string> = {
  planning: "Planning",
  generated: "Generated",
  completed: "Completed",
};

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [state, setState] = useState<DetailState>({ status: "loading" });

  const loadTrip = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const acceptedParticipantId = window.sessionStorage.getItem(
        acceptedParticipantStorageKey(params.id),
      );
      const [trip, members, participants, completions] = await Promise.all([
        getTrip(params.id),
        listMembers(params.id),
        listParticipants(params.id),
        getPreferenceStatus(params.id),
      ]);
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
        });
        return;
      }
      setState({ status: "ready", trip, members, participants, completions });
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
        </div>
      </section>

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
