import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { createInvite } from "@/lib/api/trips";
import { InviteDialog } from "@/components/trips/invite-dialog";
import type { Participant } from "@/lib/api/types";

vi.mock("@/lib/api/trips", () => ({
  createInvite: vi.fn(),
}));

const mockedCreateInvite = vi.mocked(createInvite);

const participants: Participant[] = [
  {
    id: "participant-1",
    displayName: "Sarah",
    email: "sarah@example.com",
    claimedByUid: null,
  },
];

describe("InviteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invites an existing traveler by participant id and keeps the copy link fallback", async () => {
    mockedCreateInvite.mockResolvedValueOnce({
      inviteUrl: "https://example.test/invite/token",
      emailSent: false,
    });

    render(
      <ToastProvider>
        <InviteDialog
          tripId="trip-1"
          participants={participants}
          trigger={<button type="button">Invite Traveler</button>}
        />
      </ToastProvider>,
    );

    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await user.click(screen.getByRole("button", { name: "Invite Traveler" }));
    await user.click(screen.getByRole("button", { name: "Sarah" }));
    await user.click(screen.getByRole("button", { name: "Send invite" }));

    expect(mockedCreateInvite).toHaveBeenCalledWith("trip-1", {
      email: "sarah@example.com",
      participantId: "participant-1",
    });

    const fallback = screen.getByDisplayValue("https://example.test/invite/token");
    expect(fallback).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy invite link" }));
    expect(writeText).toHaveBeenCalledWith("https://example.test/invite/token");

    expect(
      within(screen.getByText("Pending invites").closest("div")!).getByText("Link only"),
    ).toBeInTheDocument();
  });
});
