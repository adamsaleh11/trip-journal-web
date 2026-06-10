"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  List,
  MapPinned,
  MapPin,
  RotateCw,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  buildParticipantWantSummaries,
  getChronologicalTrips,
  normalizeTripMapData,
  type ParticipantWantSummary,
} from "@/components/map/trip-map-model";
import {
  getGroupPreferences,
  getTripItinerary,
  listJournalEntries,
  listManualPlans,
  listMembers,
  listParticipants,
  listTrips,
} from "@/lib/api/trips";
import type {
  GroupPreferencesEntry,
  ItineraryStop,
  JournalEntry,
  ManualPlan,
  Member,
  Participant,
  Trip,
  TripItinerary,
} from "@/lib/api/types";

const JournalMapClient = dynamic(() => import("@/components/map/journal-map-client"), {
  ssr: false,
  loading: () => <MapCanvasSkeleton />,
});

type MapState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; trips: Trip[] };

type ViewMode = "map" | "list";

type DetailState =
  | { status: "idle" }
  | { status: "loading"; trip: Trip }
  | {
      status: "ready";
      trip: Trip;
      members: Member[];
      participants: Participant[];
      preferences: GroupPreferencesEntry[];
      itinerary: TripItinerary | null;
      manualPlans: ManualPlan[];
      journalEntries: JournalEntry[];
    };

const statusLabel: Record<Trip["status"], string> = {
  planning: "Planning",
  generated: "Generated",
  completed: "Completed",
};

export function TripMap() {
  const [state, setState] = useState<MapState>({ status: "loading" });
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [providerFailed, setProviderFailed] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>({ status: "idle" });

  const loadTrips = useCallback(async () => {
    setState({ status: "loading" });
    setProviderFailed(false);
    try {
      setState({ status: "ready", trips: await listTrips() });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to load map.",
      });
    }
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const sortedTrips = useMemo(
    () => (state.status === "ready" ? getChronologicalTrips(state.trips) : []),
    [state],
  );
  const normalized = useMemo(
    () => (state.status === "ready" ? normalizeTripMapData(state.trips) : null),
    [state],
  );
  const selectedTrip = useMemo(
    () => sortedTrips.find((trip) => trip.id === selectedTripId) ?? null,
    [selectedTripId, sortedTrips],
  );

  useEffect(() => {
    if (!selectedTrip) {
      setDetailState({ status: "idle" });
      return;
    }

    let active = true;
    const tripForDetails = selectedTrip;
    setDetailState({ status: "loading", trip: tripForDetails });

    async function loadTripDetails() {
      const [
        membersResult,
        participantsResult,
        preferencesResult,
        itineraryResult,
        manualPlansResult,
        journalEntriesResult,
      ] = await Promise.allSettled([
        listMembers(tripForDetails.id),
        listParticipants(tripForDetails.id),
        getGroupPreferences(tripForDetails.id),
        getTripItinerary(tripForDetails.id),
        listManualPlans(tripForDetails.id),
        listJournalEntries(tripForDetails.id),
      ]);

      if (!active) return;

      setDetailState({
        status: "ready",
        trip: tripForDetails,
        members: settledValue(membersResult, []),
        participants: settledValue(participantsResult, []),
        preferences: settledValue(preferencesResult, []),
        itinerary: settledValue(itineraryResult, null),
        manualPlans: settledValue(manualPlansResult, []),
        journalEntries: settledValue(journalEntriesResult, []),
      });
    }

    void loadTripDetails();

    return () => {
      active = false;
    };
  }, [selectedTrip]);

  const mapUnavailable = providerFailed || viewMode === "list";

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-5rem)] bg-background sm:-mx-6 lg:-mx-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Journal map
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Trips by memory
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as ViewMode)}
              aria-label="Journal view"
              className="rounded-md border border-border bg-card/80 p-1"
            >
              <ToggleGroupItem value="map" aria-label="Map" className="gap-2">
                <MapPinned className="h-4 w-4" aria-hidden="true" />
                Map
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List" className="gap-2">
                <List className="h-4 w-4" aria-hidden="true" />
                List
              </ToggleGroupItem>
            </ToggleGroup>
            <Button variant="secondary" onClick={loadTrips} disabled={state.status === "loading"}>
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </header>

        {state.status === "loading" ? <MapSkeleton /> : null}

        {state.status === "error" ? (
          <ErrorPanel message={state.message} onRetry={loadTrips} />
        ) : null}

        {state.status === "ready" && sortedTrips.length === 0 ? <EmptyMapState /> : null}

        {state.status === "ready" && sortedTrips.length > 0 && normalized ? (
          <main className="grid min-h-0 flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <section className="min-h-[30rem] overflow-hidden rounded-lg border border-border bg-card/60">
              {normalized.missingCoordinateCount > 0 ? (
                <MissingCoordinatesNotice count={normalized.missingCoordinateCount} />
              ) : null}

              {providerFailed ? (
                <ProviderFallback />
              ) : null}

              {!mapUnavailable && normalized.points.length > 0 ? (
                <JournalMapClient
                  points={normalized.points}
                  selectedTripId={selectedTripId}
                  onSelectTrip={setSelectedTripId}
                  onProviderError={() => {
                    setProviderFailed(true);
                    setViewMode("list");
                  }}
                />
              ) : (
                <JournalList
                  trips={sortedTrips}
                  selectedTripId={selectedTripId}
                  onSelectTrip={setSelectedTripId}
                  compact={false}
                />
              )}
            </section>

            <aside className="min-h-0">
              <JournalList
                trips={sortedTrips}
                selectedTripId={selectedTripId}
                onSelectTrip={setSelectedTripId}
                compact
              />
            </aside>
          </main>
        ) : null}
      </div>

      <TripMemorySheet
        open={selectedTripId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTripId(null);
        }}
        detailState={detailState}
      />
    </div>
  );
}

function JournalList({
  trips,
  selectedTripId,
  onSelectTrip,
  compact,
}: {
  trips: Trip[];
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  compact: boolean;
}) {
  return (
    <div className={compact ? "rounded-lg border border-border bg-card/70 p-4" : "p-4 sm:p-5"}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Chronological journal</h2>
        <Badge variant="outline">{trips.length}</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {trips.map((trip) => (
          <button
            key={trip.id}
            type="button"
            onClick={() => onSelectTrip(trip.id)}
            className={[
              "block w-full rounded-md border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedTripId === trip.id
                ? "border-primary/70 bg-primary/10"
                : "border-border bg-background/35 hover:border-primary/45",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 font-medium leading-snug">{trip.name}</h3>
              <Badge variant={trip.status === "completed" ? "success" : "secondary"}>
                {statusLabel[trip.status]}
              </Badge>
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              <span className="truncate">{trip.destination.text}</span>
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDateRange(trip.startDate, trip.endDate)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function TripMemorySheet({
  open,
  onOpenChange,
  detailState,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detailState: DetailState;
}) {
  const trip = detailState.status === "idle" ? null : detailState.trip;
  const wants = useMemo<ParticipantWantSummary[]>(
    () =>
      detailState.status === "ready"
        ? buildParticipantWantSummaries(detailState.participants, detailState.preferences)
        : [],
    [detailState],
  );
  const stops = detailState.status === "ready" ? flattenStops(detailState.itinerary) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="inset-x-0 bottom-0 top-auto max-h-[88vh] w-full overflow-y-auto rounded-t-lg border-t border-border bg-background p-4 sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[30rem] sm:max-w-[30rem] sm:rounded-none sm:border-l sm:border-t-0 sm:p-6"
      >
        {trip ? (
          <SheetHeader className="pr-8 text-left">
            <Badge variant={trip.status === "completed" ? "success" : "secondary"} className="w-fit">
              {statusLabel[trip.status]}
            </Badge>
            <SheetTitle className="font-serif text-3xl leading-tight">{trip.name}</SheetTitle>
            <SheetDescription>
              {trip.destination.text} · {formatDateRange(trip.startDate, trip.endDate)}
            </SheetDescription>
          </SheetHeader>
        ) : null}

        {detailState.status === "loading" ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : null}

        {detailState.status === "ready" ? (
          <div className="mt-6 space-y-6">
            <MemberStrip members={detailState.members} participants={detailState.participants} />
            <StopPreview stops={stops} />
            <WantsSection wants={wants} />
            <ManualPlansSection manualPlans={detailState.manualPlans} />
            <JournalEntrySummary entries={detailState.journalEntries} />
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/trips/${detailState.trip.id}`}>Open trip workspace</Link>
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function MemberStrip({
  members,
  participants,
}: {
  members: Member[];
  participants: Participant[];
}) {
  const names =
    participants.length > 0
      ? participants.map((participant) => participant.displayName)
      : members.map((member) => member.displayName ?? "Traveler");

  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4 text-primary" aria-hidden="true" />
        Travelers
      </h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {names.length > 0 ? (
          names.slice(0, 8).map((name) => (
            <Avatar key={name} className="h-9 w-9">
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No travelers loaded yet.</p>
        )}
      </div>
    </section>
  );
}

function StopPreview({ stops }: { stops: ItineraryStop[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">Itinerary highlights</h3>
      <div className="mt-3 space-y-2">
        {stops.length > 0 ? (
          stops.slice(0, 4).map((stop, index) => (
            <div key={stop.id ?? `${stop.name}-${index}`} className="rounded-md border border-border bg-card/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">{stop.name}</p>
                {stop.suggested ? <Badge variant="outline">AI</Badge> : null}
              </div>
              {stop.address ? (
                <p className="mt-1 text-xs text-muted-foreground">{stop.address}</p>
              ) : null}
              {stop.whyItFits ? (
                <p className="mt-2 text-sm text-muted-foreground">{stop.whyItFits}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            No generated itinerary stops are attached yet.
          </p>
        )}
      </div>
    </section>
  );
}

function WantsSection({ wants }: { wants: ParticipantWantSummary[] }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
        What everyone wanted
      </h3>
      <div className="mt-3 space-y-3">
        {wants.length > 0 ? (
          wants.map((want) => (
            <div key={want.participantId} className="rounded-md border border-border bg-card/70 p-3">
              <p className="font-medium">{want.displayName}</p>
              {want.chips.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {want.chips.map((chip) => (
                    <Badge key={chip} variant="outline">
                      {chip}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {want.quote ? (
                <p className="mt-2 text-sm text-muted-foreground">&quot;{want.quote}&quot;</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No preference notes yet.</p>
              )}
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Preferences are not attached yet.
          </p>
        )}
      </div>
    </section>
  );
}

function ManualPlansSection({ manualPlans }: { manualPlans: ManualPlan[] }) {
  if (manualPlans.length === 0) return null;

  return (
    <section>
      <h3 className="text-sm font-semibold">Planned manually</h3>
      <div className="mt-3 space-y-2">
        {manualPlans.map((plan) => (
          <div key={plan.id} className="rounded-md border border-primary/25 bg-primary/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{plan.activity}</p>
              <Badge variant="secondary">{labelize(plan.timeOfDay)}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {labelize(plan.category)}
              {plan.date ? ` · ${formatDate(plan.date)}` : ""}
            </p>
            {plan.notes ? <p className="mt-2 text-sm text-muted-foreground">{plan.notes}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function JournalEntrySummary({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="rounded-md border border-border bg-card/60 p-3">
      <p className="text-sm text-muted-foreground">
        {entries.length} journal {entries.length === 1 ? "entry" : "entries"} saved for this trip.
      </p>
    </section>
  );
}

function MissingCoordinatesNotice({ count }: { count: number }) {
  return (
    <div className="border-b border-border bg-accent/10 px-4 py-3 text-sm text-accent-foreground">
      {count} {count === 1 ? "trip needs coordinates" : "trips need coordinates"} before it can glow on the map.
    </div>
  );
}

function ProviderFallback() {
  return (
    <div className="border-b border-border bg-destructive/10 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
        Map view is unavailable
      </p>
    </div>
  );
}

function EmptyMapState() {
  return (
    <section className="grid flex-1 place-items-center py-12">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-primary/25 bg-primary/15 shadow-glow">
          <MapPinned className="h-10 w-10 text-primary" aria-hidden="true" />
        </div>
        <h2 className="mt-6 font-serif text-3xl font-semibold">No trips to map yet</h2>
        <p className="mt-3 text-muted-foreground">
          Create a trip with a resolved destination and it will appear here.
        </p>
        <Button asChild className="mt-6">
          <Link href="/trips">Go to trips</Link>
        </Button>
      </div>
    </section>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-6 rounded-lg border border-destructive/35 bg-destructive/10 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Map could not load</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          <Button className="mt-4" variant="secondary" onClick={onRetry}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

function MapSkeleton() {
  return (
    <main className="grid flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <MapCanvasSkeleton />
      <div className="rounded-lg border border-border bg-card/70 p-4">
        <Skeleton className="h-5 w-36" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </div>
    </main>
  );
}

function MapCanvasSkeleton() {
  return (
    <div className="relative min-h-[30rem] overflow-hidden rounded-lg border border-border bg-card/60">
      <Skeleton className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
    </div>
  );
}

function flattenStops(itinerary: TripItinerary | null) {
  return itinerary?.days.flatMap((day) => day.blocks.flatMap((block) => block.stops)) ?? [];
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function formatDateRange(startDate: string, endDate: string) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function labelize(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
