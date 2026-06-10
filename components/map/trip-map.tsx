"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, MapPinned, RotateCw } from "lucide-react";
import { LngLatBounds } from "maplibre-gl";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
} from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listTrips } from "@/lib/api/trips";
import type { Trip } from "@/lib/api/types";

type MapState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; trips: Trip[] };

const statusLabel: Record<Trip["status"], string> = {
  planning: "Planning",
  generated: "Generated",
  completed: "Completed",
};

export function TripMap() {
  const [state, setState] = useState<MapState>({ status: "loading" });

  const loadTrips = useCallback(async () => {
    setState({ status: "loading" });
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

  const mappedTrips = useMemo(() => {
    if (state.status !== "ready") return [];
    const coordinateBacked = state.trips.filter(
      (trip) =>
        Number.isFinite(trip.destination.lat) &&
        Number.isFinite(trip.destination.lng),
    );
    const completed = coordinateBacked.filter((trip) => trip.status === "completed");
    return completed.length > 0 ? completed : coordinateBacked;
  }, [state]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Map
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Journal map</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A free CARTO basemap for trip destinations. Completed trips appear first;
            planning trips fill the map until the journal is live.
          </p>
        </div>
        <Button variant="secondary" onClick={loadTrips} disabled={state.status === "loading"}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {state.status === "loading" ? <MapSkeleton /> : null}

      {state.status === "error" ? (
        <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Map could not load</h2>
              <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
              <Button className="mt-4" variant="secondary" onClick={loadTrips}>
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {state.status === "ready" && mappedTrips.length === 0 ? (
        <section className="rounded-lg border border-border bg-card/80 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
            <MapPinned className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-semibold">No trips to map yet</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Create a trip with a resolved destination and it will appear here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/trips">Go to trips</Link>
          </Button>
        </section>
      ) : null}

      {state.status === "ready" && mappedTrips.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <MapCnTripMap trips={mappedTrips} />
          <TripMapList trips={mappedTrips} />
        </section>
      ) : null}
    </div>
  );
}

function MapCnTripMap({ trips }: { trips: Trip[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/80">
      <Map
        className="h-[28rem] w-full sm:h-[34rem]"
        theme="dark"
        center={[trips[0]?.destination.lng ?? 0, trips[0]?.destination.lat ?? 20]}
        zoom={trips.length === 1 ? 5 : 1.4}
      >
        <FitTripBounds trips={trips} />
        <MapControls position="top-right" showCompass showFullscreen />
        {trips.map((trip) => (
          <MapMarker
            key={trip.id}
            longitude={trip.destination.lng}
            latitude={trip.destination.lat}
          >
            <MarkerContent>
              <span className="trip-map-marker">
                {trip.destination.text.charAt(0).toUpperCase()}
              </span>
            </MarkerContent>
            <MarkerPopup closeButton>
              <div className="min-w-52 rounded-md border border-border bg-card p-3 shadow-xl">
                <p className="font-semibold">{trip.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {trip.destination.text}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDateRange(trip.startDate, trip.endDate)}
                </p>
                <Button asChild className="mt-3 w-full" size="sm" variant="secondary">
                  <Link href={`/trips/${trip.id}`}>Open trip</Link>
                </Button>
              </div>
            </MarkerPopup>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}

function FitTripBounds({ trips }: { trips: Trip[] }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || trips.length === 0) return;

    const coordinates = trips.map(
      (trip) => [trip.destination.lng, trip.destination.lat] as [number, number],
    );
    const bounds = coordinates.reduce(
      (currentBounds, coordinate) => currentBounds.extend(coordinate),
      new LngLatBounds(coordinates[0], coordinates[0]),
    );

    map.fitBounds(bounds, {
      maxZoom: trips.length === 1 ? 6 : 5,
      padding: 48,
      duration: 0,
    });
  }, [isLoaded, map, trips]);

  return null;
}

function TripMapList({ trips }: { trips: Trip[] }) {
  return (
    <div className="rounded-lg border border-border bg-card/80 p-4">
      <h2 className="font-semibold">Mapped trips</h2>
      <div className="mt-4 space-y-3">
        {trips.map((trip) => (
          <Link
            key={trip.id}
            href={`/trips/${trip.id}`}
            className="block rounded-md border border-border bg-background/35 p-3 transition hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-medium leading-snug">{trip.name}</h3>
              <Badge variant={trip.status === "completed" ? "success" : "secondary"}>
                {statusLabel[trip.status]}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{trip.destination.text}</p>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDateRange(trip.startDate, trip.endDate)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Skeleton className="h-[28rem] rounded-lg sm:h-[34rem]" />
      <div className="rounded-lg border border-border bg-card/80 p-4">
        <Skeleton className="h-5 w-28" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </div>
    </div>
  );
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
