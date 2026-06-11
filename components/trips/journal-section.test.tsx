import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JournalSection } from "./journal-section";
import { updateJournalEntry } from "@/lib/api/trips";
import type { JournalEntry } from "@/lib/api/types";

vi.mock("@/lib/api/trips", () => ({
  updateJournalEntry: vi.fn(),
}));

const mockedUpdateJournalEntry = vi.mocked(updateJournalEntry);

function journalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "places/cafe-lisboa",
    placeId: "places/cafe-lisboa",
    name: "Cafe Lisboa",
    category: "food_drink",
    address: "Rua A, Lisbon",
    source: "participant_preference",
    myEntry: null,
    ...overrides,
  };
}

describe("JournalSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders unrated stubs as private cards", () => {
    render(<JournalSection tripId="trip-1" entries={[journalEntry()]} />);

    expect(screen.getByText("Cafe Lisboa")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByLabelText("Cafe Lisboa rating")).toBeInTheDocument();
    expect(screen.getByText("Your name and trip are never included.")).toBeInTheDocument();
  });

  it("saves a private note without a rating", async () => {
    const updated = journalEntry({
      myEntry: {
        rating: null,
        note: "Private note.",
        shareAnonymously: false,
        sharedOpaqueId: null,
        shareError: null,
        updatedAt: "2026-06-10T00:00:00+00:00",
      },
    });
    mockedUpdateJournalEntry.mockResolvedValueOnce(updated);
    const onEntrySaved = vi.fn();
    render(
      <JournalSection
        tripId="trip-1"
        entries={[journalEntry()]}
        onEntrySaved={onEntrySaved}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Note"), "Private note.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedUpdateJournalEntry).toHaveBeenCalledWith("trip-1", "places/cafe-lisboa", {
      rating: null,
      note: "Private note.",
      shareAnonymously: false,
    });
    await waitFor(() => expect(onEntrySaved).toHaveBeenCalledWith(updated));
  });

  it("requires a rating before sharing", async () => {
    render(<JournalSection tripId="trip-1" entries={[journalEntry()]} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: "Share anonymously to help other travelers" }));

    expect(screen.getByText("Add a rating before sharing.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(mockedUpdateJournalEntry).not.toHaveBeenCalled();
  });

  it("saves a shared entry and can unshare it", async () => {
    const shared = journalEntry({
      myEntry: {
        rating: 5,
        note: "Worth sharing.",
        shareAnonymously: true,
        sharedOpaqueId: "opaque-1",
        shareError: null,
        updatedAt: "2026-06-10T00:00:00+00:00",
      },
    });
    mockedUpdateJournalEntry.mockResolvedValueOnce(shared);
    const onSharedStateChanged = vi.fn();
    const { rerender } = render(
      <JournalSection
        tripId="trip-1"
        entries={[journalEntry()]}
        onEntrySaved={() => undefined}
        onSharedStateChanged={onSharedStateChanged}
      />,
    );

    const user = userEvent.setup();
    const ratingGroup = screen.getByLabelText("Cafe Lisboa rating");
    await user.click(within(ratingGroup).getByRole("radio", { name: "5 stars" }));
    await user.type(screen.getByLabelText("Note"), "Worth sharing.");
    await user.click(screen.getByRole("switch", { name: "Share anonymously to help other travelers" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedUpdateJournalEntry).toHaveBeenCalledWith("trip-1", "places/cafe-lisboa", {
      rating: 5,
      note: "Worth sharing.",
      shareAnonymously: true,
    });
    await waitFor(() => expect(onSharedStateChanged).toHaveBeenCalled());

    mockedUpdateJournalEntry.mockResolvedValueOnce(
      journalEntry({
        myEntry: {
          rating: 4,
          note: "Private now.",
          shareAnonymously: false,
          sharedOpaqueId: null,
          shareError: null,
          updatedAt: "2026-06-10T01:00:00+00:00",
        },
      }),
    );
    rerender(
      <JournalSection
        tripId="trip-1"
        entries={[shared]}
        onEntrySaved={() => undefined}
        onSharedStateChanged={onSharedStateChanged}
      />,
    );
    await user.click(screen.getByRole("switch", { name: "Share anonymously to help other travelers" }));
    await user.click(within(screen.getByLabelText("Cafe Lisboa rating")).getByRole("radio", { name: "4 stars" }));
    await user.clear(screen.getByLabelText("Note"));
    await user.type(screen.getByLabelText("Note"), "Private now.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedUpdateJournalEntry).toHaveBeenLastCalledWith("trip-1", "places/cafe-lisboa", {
      rating: 4,
      note: "Private now.",
      shareAnonymously: false,
    });
  });
});
