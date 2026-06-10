"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  MapPin,
  Plus,
  RotateCw,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateTripDialog } from "@/components/trips/create-trip-dialog";
import { listParticipants, listTrips } from "@/lib/api/trips";
import type { Participant, Trip } from "@/lib/api/types";

type TripsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; trips: Trip[]; participantsByTrip: Record<string, Participant[]> };

const statusLabel: Record<Trip["status"], string> = {
  planning: "Planning",
  generated: "Generated",
  completed: "Completed",
};

export default function TripsPage() {
  const [state, setState] = useState<TripsState>({ status: "loading" });

  const loadTrips = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const trips = await listTrips();
      const participantEntries = await Promise.all(
        trips.map(async (trip) => [trip.id, await listParticipants(trip.id)] as const),
      );
      setState({
        status: "ready",
        trips,
        participantsByTrip: Object.fromEntries(participantEntries),
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to load trips.",
      });
    }
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Trips
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Your travel desk</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Plan together, collect preferences, and keep each trip ready for the
            journal map.
          </p>
        </div>
        <CreateTripDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New trip
            </Button>
          }
        />
      </div>

      {state.status === "loading" ? <TripsSkeleton /> : null}

      {state.status === "error" ? (
        <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Trips could not load</h2>
              <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
              <Button className="mt-4" variant="secondary" onClick={loadTrips}>
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {state.status === "ready" && state.trips.length === 0 ? (
        <section className="rounded-lg border border-border bg-card/80 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-semibold">Plan your first trip</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Create a shared trip, invite friends, and turn everyone&apos;s preferences
            into a clear planning workspace.
          </p>
          <CreateTripDialog trigger={<Button className="mt-6">Start a trip</Button>} />
        </section>
      ) : null}

      {state.status === "ready" && state.trips.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              participants={state.participantsByTrip[trip.id] ?? []}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TripsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card/70 p-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-6 h-8 w-4/5" />
          <Skeleton className="mt-3 h-4 w-3/5" />
          <div className="mt-8 flex items-center justify-between">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TripCard({ trip, participants }: { trip: Trip; participants: Participant[] }) {
  const dateRange = useMemo(
    () => `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`,
    [trip.endDate, trip.startDate],
  );

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group flex min-h-72 flex-col rounded-lg border border-border bg-card/82 p-5 transition hover:border-primary/45 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge variant={trip.status === "completed" ? "success" : "secondary"}>
          {statusLabel[trip.status]}
        </Badge>
        <span className="text-xs text-muted-foreground">{participants.length} travelers</span>
      </div>
      <div className="mt-7 flex-1">
        <h2 className="font-serif text-3xl font-semibold leading-tight group-hover:text-primary">
          {trip.name}
        </h2>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="truncate">{trip.destination.text}</span>
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          {dateRange}
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <StackedParticipants participants={participants} />
        <span className="text-sm font-medium text-primary">Open</span>
      </div>
    </Link>
  );
}

function StackedParticipants({ participants }: { participants: Participant[] }) {
  return (
    <div className="flex -space-x-2">
      {participants.slice(0, 4).map((participant) => (
        <Avatar key={participant.id} className="h-9 w-9 ring-2 ring-card">
          <AvatarFallback>{initials(participant.displayName)}</AvatarFallback>
        </Avatar>
      ))}
      {participants.length > 4 ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-xs ring-2 ring-card">
          +{participants.length - 4}
        </div>
      ) : null}
    </div>
  );
}

function initials(name: string | null | undefined) {
  if (!name) return "T";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}
