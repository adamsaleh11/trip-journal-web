"use client";

import { useEffect, useMemo } from "react";
import { LngLatBounds } from "maplibre-gl";
import {
  Map,
  MapControls,
  MapHeatLayer,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  useMap,
} from "@/components/ui/map";
import {
  buildHeatmapCollection,
  type TripMapPoint,
} from "@/components/map/trip-map-model";
import { cn } from "@/lib/utils";

export default function JournalMapClient({
  points,
  selectedTripId,
  onSelectTrip,
  onProviderError,
}: {
  points: TripMapPoint[];
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  onProviderError: () => void;
}) {
  const heatmapCollection = useMemo(() => buildHeatmapCollection(points), [points]);
  const styles = useMemo(() => getMapStyles(), []);

  return (
    <Map
      className="h-[30rem] min-h-full w-full sm:h-[38rem] lg:h-full"
      theme="dark"
      styles={styles}
      center={points[0]?.coordinates ?? [0, 20]}
      zoom={points.length === 1 ? 5 : 1.6}
      attributionControl={{ compact: true }}
      onError={onProviderError}
    >
      <FitBounds points={points} />
      <FlyToSelection points={points} selectedTripId={selectedTripId} />
      <MapHeatLayer id="trip-journal-heat" data={heatmapCollection} />
      <MapControls position="top-right" showCompass showFullscreen />
      {points.map((point) => (
        <MapMarker
          key={point.id}
          longitude={point.coordinates[0]}
          latitude={point.coordinates[1]}
          offset={point.offset}
          onClick={(event) => {
            event.stopPropagation();
            onSelectTrip(point.id);
          }}
        >
          <MarkerContent>
            <span
              className={cn(
                "trip-map-waypoint",
                point.markerTone === "bright" && "trip-map-waypoint-bright",
                point.markerTone === "muted" && "trip-map-waypoint-muted",
                selectedTripId === point.id && "trip-map-waypoint-selected",
              )}
              aria-label={point.name}
            >
              <span>{point.name.charAt(0).toUpperCase()}</span>
            </span>
          </MarkerContent>
          <MarkerTooltip>
            <span className="font-medium">{point.name}</span>
          </MarkerTooltip>
        </MapMarker>
      ))}
    </Map>
  );
}

function FitBounds({ points }: { points: TripMapPoint[] }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || points.length === 0) return;

    const bounds = points.reduce(
      (currentBounds, point) => currentBounds.extend(point.coordinates),
      new LngLatBounds(points[0].coordinates, points[0].coordinates),
    );

    map.fitBounds(bounds, {
      maxZoom: points.length === 1 ? 6 : 4.8,
      padding: { top: 72, right: 72, bottom: 72, left: 72 },
      duration: 0,
    });
  }, [isLoaded, map, points]);

  return null;
}

function FlyToSelection({
  points,
  selectedTripId,
}: {
  points: TripMapPoint[];
  selectedTripId: string | null;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || !selectedTripId) return;
    const point = points.find((candidate) => candidate.id === selectedTripId);
    if (!point) return;

    map.flyTo({
      center: point.coordinates,
      zoom: 10,
      speed: 0.9,
      curve: 1.25,
      essential: true,
    });
  }, [isLoaded, map, points, selectedTripId]);

  return null;
}

function getMapStyles() {
  const mapcnStyleUrl = process.env.NEXT_PUBLIC_MAPCN_STYLE_URL;

  if (!mapcnStyleUrl) return undefined;

  return {
    dark: mapcnStyleUrl,
    light: mapcnStyleUrl,
  };
}
