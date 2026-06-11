import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PreferencesSection } from "./preferences-section";
import {
  getGroupPreferences,
  getPreferenceStatus,
  updateParticipantCategoryPreference,
} from "@/lib/api/trips";
import type {
  CompletionEntry,
  GroupPreferencesEntry,
  Member,
  Participant,
} from "@/lib/api/types";

vi.mock("@/lib/api/trips", () => ({
  getGroupPreferences: vi.fn(),
  getPreferenceStatus: vi.fn(),
  updateParticipantCategoryPreference: vi.fn(),
}));

const participants: Participant[] = [
  { id: "p1", displayName: "Adam", claimedByUid: "uid-adam" },
  { id: "p2", displayName: "Mom", claimedByUid: null },
];

const members: Member[] = [
  { uid: "uid-adam", displayName: "Adam", role: "admin", joinedAt: "2026-06-01" },
];

const filledStatus: CompletionEntry[] = [
  {
    participantId: "p1",
    displayName: "Adam",
    claimedByUid: "uid-adam",
    filled: {
      food_drink: true,
      outdoors_scenic: false,
      nightlife: false,
      culture_local: false,
      logistics: false,
    },
  },
  {
    participantId: "p2",
    displayName: "Mom",
    claimedByUid: null,
    filled: {
      food_drink: false,
      outdoors_scenic: false,
      nightlife: false,
      culture_local: false,
      logistics: false,
    },
  },
];

const groupPrefs: GroupPreferencesEntry[] = [
  {
    participantId: "p1",
    displayName: "Adam",
    claimedByUid: "uid-adam",
    preferences: {
      food_drink: {
        schemaVersion: 1,
        freeText: "steakhouse, local fruits",
        dietaryRestrictions: ["vegetarian"],
        cuisineInterests: ["Portuguese"],
        mealBudget: { amount: 75, currency: "USD" },
        drinkInterests: [],
        sportsBarInterest: false,
      },
      outdoors_scenic: null,
      nightlife: null,
      culture_local: null,
      logistics: null,
    },
  },
  {
    participantId: "p2",
    displayName: "Mom",
    claimedByUid: null,
    preferences: {
      food_drink: null,
      outdoors_scenic: null,
      nightlife: null,
      culture_local: null,
      logistics: null,
    },
  },
];

beforeEach(() => {
  vi.mocked(getPreferenceStatus).mockResolvedValue(filledStatus);
  vi.mocked(getGroupPreferences).mockResolvedValue(groupPrefs);
  vi.mocked(updateParticipantCategoryPreference).mockReset();
});

describe("PreferencesSection saved-preference visibility", () => {
  it("shows saved value chips and comma-separated wish tags for the auto-selected participant", async () => {
    render(
      <PreferencesSection
        tripId="trip-1"
        participants={participants}
        members={members}
        currentUid="uid-adam"
      />,
    );

    expect(await screen.findByText("Adam's Preferences")).toBeInTheDocument();
    expect(screen.getByText("Vegetarian")).toBeInTheDocument();
    expect(screen.getByText("Portuguese")).toBeInTheDocument();
    expect(screen.getByText("Meals ~$75 USD")).toBeInTheDocument();
    expect(screen.getByText("steakhouse")).toBeInTheDocument();
    expect(screen.getByText("local fruits")).toBeInTheDocument();
    expect(screen.queryByText("steakhouse, local fruits")).not.toBeInTheDocument();
  });

  it("shows the AI auto-fill hint for unfilled categories of an unclaimed participant", async () => {
    render(
      <PreferencesSection
        tripId="trip-1"
        participants={participants}
        members={members}
        currentUid="uid-adam"
      />,
    );

    await screen.findByText("Adam's Preferences");
    // Outdoors is empty for Adam -> hint present.
    expect(screen.getAllByText("AI will auto-fill").length).toBeGreaterThan(0);
  });

  it("no longer renders the Coming Soon placeholder", async () => {
    render(
      <PreferencesSection
        tripId="trip-1"
        participants={participants}
        members={members}
        currentUid="uid-adam"
      />,
    );
    await screen.findByText("Adam's Preferences");
    await waitFor(() =>
      expect(screen.queryByText(/Coming Soon/i)).not.toBeInTheDocument(),
    );
  });
});
