import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddTravelerDialog } from "@/components/trips/add-traveler-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { createInvite, createParticipant } from "@/lib/api/trips";

vi.mock("@/lib/api/trips", () => ({
  createInvite: vi.fn(),
  createParticipant: vi.fn(),
}));

const mockedCreateParticipant = vi.mocked(createParticipant);
const mockedCreateInvite = vi.mocked(createInvite);

describe("AddTravelerDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an unclaimed traveler without sending an invite", async () => {
    const onParticipantCreated = vi.fn();
    mockedCreateParticipant.mockResolvedValueOnce({
      id: "participant-1",
      displayName: "Sarah",
      email: "sarah@example.com",
      notes: "Vegetarian",
      claimedByUid: null,
    });

    render(
      <ToastProvider>
        <AddTravelerDialog
          tripId="trip-1"
          trigger={<button type="button">Add Traveler</button>}
          onParticipantCreated={onParticipantCreated}
        />
      </ToastProvider>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add Traveler" }));
    await user.type(screen.getByLabelText("Name"), "Sarah");
    await user.type(screen.getByLabelText("Email"), "sarah@example.com");
    await user.type(screen.getByLabelText("Notes"), "Vegetarian");
    await user.click(screen.getByRole("button", { name: "Add traveler" }));

    expect(mockedCreateParticipant).toHaveBeenCalledWith("trip-1", {
      displayName: "Sarah",
      email: "sarah@example.com",
      notes: "Vegetarian",
    });
    expect(mockedCreateInvite).not.toHaveBeenCalled();
    expect(onParticipantCreated).toHaveBeenCalledTimes(1);
  });
});
