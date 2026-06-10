import type React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TripMap } from "@/components/map/trip-map";
import {
  getGroupPreferences,
  getTripItinerary,
  listJournalEntries,
  listManualPlans,
  listMembers,
  listParticipants,
  listTrips,
} from "@/lib/api/trips";
import { searchDestinations } from "@/lib/api/places";
import type { Trip } from "@/lib/api/types";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>) => {
    void loader();
    return function MockDynamicMap(props: {
      points: Array<{ id: string; name: string }>;
      onSelectTrip: (tripId: string) => void;
      onProviderError: () => void;
    }) {
      return (
        <div data-testid="journal-map-client">
          {props.points.map((point) => (
            <button key={point.id} type="button" onClick={() => props.onSelectTrip(point.id)}>
              Map marker {point.name}
            </button>
          ))}
          <button type="button" onClick={props.onProviderError}>
            Simulate provider failure
          </button>
        </div>
      );
    };
  },
}));

vi.mock("@/components/map/journal-map-client", () => ({
  default: () => null,
}));

vi.mock("@/lib/api/trips", () => ({
  listTrips: vi.fn(),
  listMembers: vi.fn(),
  listParticipants: vi.fn(),
  getGroupPreferences: vi.fn(),
  getTripItinerary: vi.fn(),
  listManualPlans: vi.fn(),
  listJournalEntries: vi.fn(),
}));

vi.mock("@/lib/api/places", () => ({
  searchDestinations: vi.fn(),
}));

const mockedListTrips = vi.mocked(listTrips);
const mockedListMembers = vi.mocked(listMembers);
const mockedListParticipants = vi.mocked(listParticipants);
const mockedGetGroupPreferences = vi.mocked(getGroupPreferences);
const mockedGetTripItinerary = vi.mocked(getTripItinerary);
const mockedListManualPlans = vi.mocked(listManualPlans);
const mockedListJournalEntries = vi.mocked(listJournalEntries);
const mockedSearchDestinations = vi.mocked(searchDestinations);

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

describe("TripMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListMembers.mockResolvedValue([]);
    mockedListParticipants.mockResolvedValue([]);
    mockedGetGroupPreferences.mockResolvedValue([]);
    mockedGetTripItinerary.mockResolvedValue({ days: [] });
    mockedListManualPlans.mockResolvedValue([]);
    mockedListJournalEntries.mockResolvedValue([]);
  });

  it("requests only signed-in trips and never performs destination search", async () => {
    mockedListTrips.mockResolvedValueOnce([trip()]);

    render(<TripMap />);

    expect(await screen.findByTestId("journal-map-client")).toBeInTheDocument();
    expect(mockedListTrips).toHaveBeenCalledTimes(1);
    expect(mockedSearchDestinations).not.toHaveBeenCalled();
  });

  it("keeps missing-coordinate trips in the journal list", async () => {
    mockedListTrips.mockResolvedValueOnce([
      trip(),
      trip({
        id: "trip-2",
        name: "Mystery trip",
        destination: { text: "Somewhere", lat: Number.NaN, lng: Number.NaN, placeId: "places/mystery" },
      }),
    ]);

    render(<TripMap />);

    expect(await screen.findByText(/1 trip needs coordinates/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "List" }));
    expect(screen.getAllByText("Mystery trip").length).toBeGreaterThan(0);
  });

  it("opens the shared trip sheet with participant wants and manual plans", async () => {
    mockedListTrips.mockResolvedValueOnce([trip()]);
    mockedListMembers.mockResolvedValueOnce([
      { uid: "uid-1", displayName: "Sarah", role: "member", joinedAt: "2026-01-01T00:00:00Z" },
    ]);
    mockedListParticipants.mockResolvedValueOnce([
      { id: "p1", displayName: "Sarah", claimedByUid: "uid-1" },
    ]);
    mockedGetGroupPreferences.mockResolvedValueOnce([
      {
        participantId: "p1",
        displayName: "Sarah",
        preferences: {
          food_drink: {
            schemaVersion: 1,
            freeText: "Best gelato.",
            dietaryRestrictions: ["vegetarian"],
            cuisineInterests: ["pastries"],
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
    ]);
    mockedGetTripItinerary.mockResolvedValueOnce({
      days: [
        {
          date: "2026-05-02",
          title: "Day 1",
          blocks: [
            {
              timeOfDay: "morning",
              stops: [
                {
                  id: "stop-1",
                  name: "Pastelaria Central",
                  address: "Rua Augusta",
                  category: "food_drink",
                  suggested: false,
                },
              ],
            },
          ],
        },
      ],
    });
    mockedListManualPlans.mockResolvedValueOnce([
      {
        id: "manual-1",
        category: "culture_local",
        activity: "Tile museum",
        timeOfDay: "afternoon",
        date: "2026-05-03",
        notes: "Already booked",
        createdByUid: "admin-1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);

    render(<TripMap />);

    await userEvent.click(await screen.findByRole("button", { name: "Map marker Lisbon long weekend" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Lisbon long weekend")).toBeInTheDocument();
    expect(within(dialog).getByText("Pastelaria Central")).toBeInTheDocument();
    expect(within(dialog).getByText("Sarah")).toBeInTheDocument();
    expect(within(dialog).getByText(/Best gelato/)).toBeInTheDocument();
    expect(within(dialog).getByText("Tile museum")).toBeInTheDocument();
    expect(mockedListManualPlans).toHaveBeenCalledWith("trip-1");
  });

  it("falls back to the journal list when the provider fails", async () => {
    mockedListTrips.mockResolvedValueOnce([trip()]);

    render(<TripMap />);

    await userEvent.click(await screen.findByRole("button", { name: "Simulate provider failure" }));

    expect(screen.getByText("Map view is unavailable")).toBeInTheDocument();
    expect(screen.getAllByText("Lisbon long weekend").length).toBeGreaterThan(0);
  });
});
