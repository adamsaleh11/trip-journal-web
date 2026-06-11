import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TripTravelersSection } from "@/components/trips/trip-travelers-section";
import { ToastProvider } from "@/components/ui/toast";
import { createInvite, removeParticipant } from "@/lib/api/trips";
import type { Participant } from "@/lib/api/types";

vi.mock("@/lib/api/trips", () => ({
  createInvite: vi.fn(),
  createParticipant: vi.fn(),
  removeParticipant: vi.fn(),
}));

const mockedCreateInvite = vi.mocked(createInvite);
const mockedRemoveParticipant = vi.mocked(removeParticipant);

const participants: Participant[] = [
  {
    id: "participant-1",
    displayName: "Sarah",
    email: "sarah@example.com",
    claimedByUid: "uid-sarah",
  },
  {
    id: "participant-2",
    displayName: "Mina",
    claimedByUid: null,
  },
];

describe("TripTravelersSection", () => {
  it("shows traveler claimed state and admin actions", () => {
    render(
      <ToastProvider>
        <TripTravelersSection
          tripId="trip-1"
          participants={participants}
          isAdmin
          onParticipantsChanged={() => undefined}
        />
      </ToastProvider>,
    );

    expect(screen.getByText("Sarah")).toBeInTheDocument();
    expect(screen.getByText("Claimed")).toBeInTheDocument();
    expect(screen.getByText("Mina")).toBeInTheDocument();
    expect(screen.getByText("Unclaimed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Traveler" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite Traveler" })).toBeInTheDocument();
  });

  it("hides add and invite controls from non-admins", () => {
    render(
      <ToastProvider>
        <TripTravelersSection
          tripId="trip-1"
          participants={participants}
          isAdmin={false}
          onParticipantsChanged={() => undefined}
        />
      </ToastProvider>,
    );

    expect(screen.queryByRole("button", { name: "Add Traveler" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite Traveler" })).not.toBeInTheDocument();
  });

  it("invites an unclaimed traveler from their roster row", async () => {
    mockedCreateInvite.mockResolvedValueOnce({
      inviteUrl: "https://example.test/invite/token",
      emailSent: true,
    });

    render(
      <ToastProvider>
        <TripTravelersSection
          tripId="trip-1"
          participants={participants}
          isAdmin
          onParticipantsChanged={() => undefined}
        />
      </ToastProvider>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Invite" }));
    await user.type(screen.getByLabelText("Email"), "mina@example.com");
    await user.click(screen.getByRole("button", { name: "Send invite" }));

    expect(mockedCreateInvite).toHaveBeenCalledWith("trip-1", {
      email: "mina@example.com",
      participantId: "participant-2",
    });
    expect(screen.getByDisplayValue("https://example.test/invite/token")).toBeInTheDocument();
  });

  it("removes a traveler after confirmation, but never the trip admin", async () => {
    mockedRemoveParticipant.mockResolvedValueOnce(undefined);
    const onParticipantsChanged = vi.fn();

    render(
      <ToastProvider>
        <TripTravelersSection
          tripId="trip-1"
          participants={participants}
          isAdmin
          adminUid="uid-sarah"
          onParticipantsChanged={onParticipantsChanged}
        />
      </ToastProvider>,
    );

    // Sarah claimed the admin uid, so her row has no remove button.
    expect(screen.queryByRole("button", { name: "Remove Sarah" })).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Remove Mina" }));
    await user.click(screen.getByRole("button", { name: "Remove traveler" }));

    expect(mockedRemoveParticipant).toHaveBeenCalledWith("trip-1", "participant-2");
    expect(onParticipantsChanged).toHaveBeenCalled();
  });

  it("hides remove buttons from non-admins", () => {
    render(
      <ToastProvider>
        <TripTravelersSection
          tripId="trip-1"
          participants={participants}
          isAdmin={false}
          adminUid="uid-sarah"
          onParticipantsChanged={() => undefined}
        />
      </ToastProvider>,
    );

    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
  });
});
