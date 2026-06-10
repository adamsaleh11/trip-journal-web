import type {
  GroupPreferencesEntry,
  MemberPreferences,
  Participant,
  PreferenceCategory,
  Trip,
} from "@/lib/api/types";

export type TripMapPoint = {
  id: string;
  name: string;
  destinationText: string;
  coordinates: [number, number];
  placeId: string | null;
  startDate: string;
  endDate: string;
  status: Trip["status"];
  glowWeight: number;
  markerTone: "bright" | "standard" | "muted";
  offset: [number, number];
};

export type NormalizedTripMapData = {
  points: TripMapPoint[];
  listOnlyTrips: Trip[];
  missingCoordinateCount: number;
};

export type ParticipantWantSummary = {
  participantId: string;
  displayName: string;
  chips: string[];
  quote: string | null;
};

const statusWeight: Record<Trip["status"], number> = {
  completed: 1.35,
  generated: 1,
  planning: 0.7,
};

const statusTone: Record<Trip["status"], TripMapPoint["markerTone"]> = {
  completed: "bright",
  generated: "standard",
  planning: "muted",
};

const categoryOrder: PreferenceCategory[] = [
  "food_drink",
  "outdoors_scenic",
  "nightlife",
  "culture_local",
  "logistics",
];

export function normalizeTripMapData(trips: Trip[]): NormalizedTripMapData {
  const listOnlyTrips: Trip[] = [];
  const points: TripMapPoint[] = [];
  const coordinateCounts = new Map<string, number>();

  for (const trip of trips) {
    const { lat, lng } = trip.destination;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      listOnlyTrips.push(trip);
      continue;
    }

    const coordinateKey = `${lng.toFixed(4)}:${lat.toFixed(4)}`;
    const coordinateIndex = coordinateCounts.get(coordinateKey) ?? 0;
    coordinateCounts.set(coordinateKey, coordinateIndex + 1);

    points.push({
      id: trip.id,
      name: trip.name,
      destinationText: trip.destination.text,
      coordinates: [lng, lat],
      placeId: trip.destination.placeId ?? null,
      startDate: trip.startDate,
      endDate: trip.endDate,
      status: trip.status,
      glowWeight: statusWeight[trip.status],
      markerTone: statusTone[trip.status],
      offset: getMarkerOffset(coordinateIndex),
    });
  }

  return {
    points,
    listOnlyTrips,
    missingCoordinateCount: listOnlyTrips.length,
  };
}

export function getChronologicalTrips(trips: Trip[]) {
  return [...trips].sort((left, right) => right.startDate.localeCompare(left.startDate));
}

export function buildHeatmapCollection(points: TripMapPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((point) => ({
      type: "Feature" as const,
      properties: {
        tripId: point.id,
        weight: point.glowWeight,
        status: point.status,
      },
      geometry: {
        type: "Point" as const,
        coordinates: point.coordinates,
      },
    })),
  };
}

export function buildMarkerCollection(points: TripMapPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((point) => ({
      type: "Feature" as const,
      properties: {
        tripId: point.id,
        name: point.name,
        destinationText: point.destinationText,
        status: point.status,
        markerTone: point.markerTone,
      },
      geometry: {
        type: "Point" as const,
        coordinates: point.coordinates,
      },
    })),
  };
}

export function buildParticipantWantSummaries(
  participants: Participant[],
  preferenceEntries: GroupPreferencesEntry[],
): ParticipantWantSummary[] {
  const entriesByParticipant = new Map(
    preferenceEntries.map((entry) => [entry.participantId, entry]),
  );

  return participants.map((participant) => {
    const preferences = entriesByParticipant.get(participant.id)?.preferences;
    return {
      participantId: participant.id,
      displayName: participant.displayName,
      chips: preferences ? collectPreferenceChips(preferences).slice(0, 7) : [],
      quote: preferences ? collectFirstQuote(preferences) : null,
    };
  });
}

function getMarkerOffset(index: number): [number, number] {
  if (index === 0) return [0, 0];
  const ring = Math.ceil(index / 8);
  const angle = (index - 1) * 0.7853981634;
  const distance = 18 * ring;
  return [Math.round(Math.cos(angle) * distance), Math.round(Math.sin(angle) * distance)];
}

function collectFirstQuote(preferences: MemberPreferences) {
  for (const category of categoryOrder) {
    const quote = preferences[category]?.freeText?.trim();
    if (quote) return quote;
  }
  return null;
}

function collectPreferenceChips(preferences: MemberPreferences) {
  const chips: string[] = [];

  for (const category of categoryOrder) {
    const preference = preferences[category];
    if (!preference) continue;

    for (const value of Object.values(preference)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry === "string" && entry !== "none") {
            chips.push(labelize(entry));
          }
        }
      } else if (typeof value === "string" && value !== "none" && value !== preference.freeText) {
        chips.push(labelize(value));
      } else if (typeof value === "boolean" && value) {
        chips.push(labelize(booleanPreferenceLabel(category)));
      }
    }
  }

  return Array.from(new Set(chips));
}

function booleanPreferenceLabel(category: PreferenceCategory) {
  if (category === "food_drink") return "sports bar";
  if (category === "outdoors_scenic") return "photo spots";
  return category;
}

function labelize(value: string) {
  if (value === "$" || value === "$$" || value === "$$$") return value;
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
