import { describe, expect, it } from "vitest";
import {
  buildHeatmapCollection,
  buildMarkerCollection,
  buildParticipantWantSummaries,
  getChronologicalTrips,
  normalizeTripMapData,
} from "@/components/map/trip-map-model";
import type { GroupPreferencesEntry, Participant, Trip } from "@/lib/api/types";

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    name: "Lisbon long weekend",
    destination: {
      text: "Lisbon, Portugal",
      lat: 38.7223,
      lng: -9.1393,
      placeId: "places/lisbon",
    },
    startDate: "2026-05-01",
    endDate: "2026-05-05",
    status: "completed",
    adminUid: "admin-1",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("trip map model", () => {
  it("normalizes coordinate-backed trips while preserving Google Places ids", () => {
    const trips = [
      trip(),
      trip({
        id: "trip-2",
        name: "Missing latitude",
        destination: { text: "Unknown", lat: Number.NaN, lng: 10, placeId: "places/missing" },
      }),
    ];

    const normalized = normalizeTripMapData(trips);

    expect(normalized.points).toEqual([
      expect.objectContaining({
        id: "trip-1",
        coordinates: [-9.1393, 38.7223],
        placeId: "places/lisbon",
        glowWeight: expect.any(Number),
      }),
    ]);
    expect(normalized.listOnlyTrips).toHaveLength(1);
    expect(normalized.missingCoordinateCount).toBe(1);
  });

  it("makes completed trips visually stronger than planning trips", () => {
    const completed = trip({ id: "completed", status: "completed" });
    const planning = trip({ id: "planning", status: "planning" });

    const { points } = normalizeTripMapData([completed, planning]);

    const completedPoint = points.find((point) => point.id === "completed");
    const planningPoint = points.find((point) => point.id === "planning");
    expect(completedPoint?.glowWeight).toBeGreaterThan(planningPoint?.glowWeight ?? 0);
    expect(completedPoint?.markerTone).toBe("bright");
    expect(planningPoint?.markerTone).toBe("muted");
  });

  it("builds heatmap and marker feature collections from normalized points", () => {
    const { points } = normalizeTripMapData([
      trip(),
      trip({
        id: "trip-2",
        name: "Porto",
        destination: { text: "Porto", lat: 41.1579, lng: -8.6291, placeId: "places/porto" },
        status: "planning",
      }),
    ]);

    expect(buildHeatmapCollection(points).features).toHaveLength(2);
    expect(buildHeatmapCollection(points).features[0].properties).toEqual(
      expect.objectContaining({ weight: expect.any(Number), tripId: "trip-1" }),
    );
    expect(buildMarkerCollection(points).features[1].properties).toEqual(
      expect.objectContaining({ name: "Porto", markerTone: "muted" }),
    );
  });

  it("sorts the journal list chronologically by trip start", () => {
    const sorted = getChronologicalTrips([
      trip({ id: "newer", startDate: "2026-08-01" }),
      trip({ id: "older", startDate: "2025-08-01" }),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(["newer", "older"]);
  });

  it("summarizes participant wants without mixing manual plans into preferences", () => {
    const participants: Participant[] = [
      { id: "p1", displayName: "Sarah", claimedByUid: "uid-1" },
      { id: "p2", displayName: "Mina", claimedByUid: null },
    ];
    const preferences: GroupPreferencesEntry[] = [
      {
        participantId: "p1",
        displayName: "Ignored source name",
        preferences: {
          food_drink: {
            schemaVersion: 1,
            freeText: "Best gelato and late dinners.",
            dietaryRestrictions: ["vegetarian"],
            cuisineInterests: ["seafood", "pastries"],
            mealBudget: "$$",
            drinkInterests: ["coffee"],
            sportsBarInterest: false,
          },
          outdoors_scenic: null,
          nightlife: null,
          culture_local: null,
          logistics: null,
        },
      },
    ];

    expect(buildParticipantWantSummaries(participants, preferences)).toEqual([
      {
        participantId: "p1",
        displayName: "Sarah",
        chips: ["Vegetarian", "Seafood", "Pastries", "$$", "Coffee"],
        quote: "Best gelato and late dinners.",
      },
      {
        participantId: "p2",
        displayName: "Mina",
        chips: [],
        quote: null,
      },
    ]);
  });
});
