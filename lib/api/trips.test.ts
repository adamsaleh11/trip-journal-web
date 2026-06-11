import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, publicApiFetch } from "@/lib/api/client";
import {
  acceptInvite,
  completeTrip,
  createInvite,
  createParticipant,
  getTripItinerary,
  listJournalEntries,
  listManualPlans,
  listParticipants,
  saveWhimToJournal,
  updateJournalEntry,
  updateParticipant,
} from "@/lib/api/trips";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
  publicApiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);
const mockedPublicApiFetch = vi.mocked(publicApiFetch);

describe("trip API participants contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists traveler participants separately from memberships", async () => {
    mockedApiFetch.mockResolvedValueOnce([]);

    await listParticipants("trip-1");

    expect(mockedApiFetch).toHaveBeenCalledWith("/trips/trip-1/participants");
  });

  it("creates unclaimed traveler participants without inviting them", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      id: "participant-1",
      displayName: "Sarah",
      email: "sarah@example.com",
      notes: "Vegetarian",
      claimedByUid: null,
    });

    await createParticipant("trip-1", {
      displayName: "Sarah",
      email: "sarah@example.com",
      notes: "Vegetarian",
    });

    expect(mockedApiFetch).toHaveBeenCalledWith("/trips/trip-1/participants", {
      method: "POST",
      body: {
        displayName: "Sarah",
        email: "sarah@example.com",
        notes: "Vegetarian",
      },
    });
  });

  it("updates existing participants by participant id", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      id: "participant-1",
      displayName: "Sarah A.",
      claimedByUid: null,
    });

    await updateParticipant("trip-1", "participant-1", {
      displayName: "Sarah A.",
    });

    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/trips/trip-1/participants/participant-1",
      {
        method: "PATCH",
        body: { displayName: "Sarah A." },
      },
    );
  });

  it("can invite an existing participant without creating a duplicate traveler", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      inviteUrl: "https://example.test/invite/token",
      emailSent: false,
    });

    await createInvite("trip-1", {
      email: "sarah@example.com",
      participantId: "participant-1",
    });

    expect(mockedApiFetch).toHaveBeenCalledWith("/trips/trip-1/invites", {
      method: "POST",
      body: {
        email: "sarah@example.com",
        participantId: "participant-1",
      },
    });
  });

  it("returns the claimed participant id when accepting an invite", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      tripId: "trip-1",
      participantId: "participant-1",
    });

    await expect(acceptInvite("token")).resolves.toEqual({
      tripId: "trip-1",
      participantId: "participant-1",
    });

    expect(mockedApiFetch).toHaveBeenCalledWith("/invites/token/accept", {
      method: "POST",
    });
    expect(mockedPublicApiFetch).not.toHaveBeenCalled();
  });

  it("reads generated itinerary, manual plans, and journal entries from member-scoped trip endpoints", async () => {
    mockedApiFetch.mockResolvedValueOnce({ days: [] });
    mockedApiFetch.mockResolvedValueOnce([]);
    mockedApiFetch.mockResolvedValueOnce([]);

    await getTripItinerary("trip-1");
    await listManualPlans("trip-1");
    await listJournalEntries("trip-1");

    expect(mockedApiFetch).toHaveBeenNthCalledWith(1, "/trips/trip-1/itinerary");
    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, "/trips/trip-1/manual-plans");
    expect(mockedApiFetch).toHaveBeenNthCalledWith(3, "/trips/trip-1/journal");
  });

  it("calls the journal completion and contribution routes", async () => {
    mockedApiFetch.mockResolvedValueOnce({ id: "trip-1", status: "completed" });
    mockedApiFetch.mockResolvedValueOnce({ placeId: "places/cafe-lisboa" });
    mockedApiFetch.mockResolvedValueOnce({ placeId: "places/gelato", source: "whim" });

    await completeTrip("trip-1");
    await updateJournalEntry("trip-1", "places/cafe-lisboa", {
      rating: 5,
      note: "Worth remembering.",
      shareAnonymously: true,
    });
    await saveWhimToJournal("trip-1", "whim-1");

    expect(mockedApiFetch).toHaveBeenNthCalledWith(1, "/trips/trip-1/complete", {
      method: "POST",
    });
    expect(mockedApiFetch).toHaveBeenNthCalledWith(
      2,
      "/trips/trip-1/journal/places%2Fcafe-lisboa",
      {
        method: "PUT",
        body: {
          rating: 5,
          note: "Worth remembering.",
          shareAnonymously: true,
        },
      },
    );
    expect(mockedApiFetch).toHaveBeenNthCalledWith(
      3,
      "/trips/trip-1/journal/from-whim/whim-1",
      { method: "POST" },
    );
  });
});
