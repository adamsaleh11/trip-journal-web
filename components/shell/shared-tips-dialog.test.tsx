import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SharedTipsDialog } from "./shared-tips-dialog";
import { deleteSharedTip, listSharedTips } from "@/lib/api/me";

vi.mock("@/lib/api/me", () => ({
  listSharedTips: vi.fn(),
  deleteSharedTip: vi.fn(),
}));

const mockedListSharedTips = vi.mocked(listSharedTips);
const mockedDeleteSharedTip = vi.mocked(deleteSharedTip);

describe("SharedTipsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads shared tips and deletes after confirmation", async () => {
    mockedListSharedTips.mockResolvedValueOnce([
      {
        opaqueId: "opaque-1",
        placeId: "places/cafe",
        tripName: "Lisbon Weekend",
        venueName: "Cafe Lisboa",
        category: "food_drink",
      },
    ]);
    mockedDeleteSharedTip.mockResolvedValueOnce(undefined);

    render(<SharedTipsDialog open onOpenChange={() => undefined} />);
    const user = userEvent.setup();

    expect(await screen.findByText("Cafe Lisboa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete shared tip?")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);

    expect(mockedDeleteSharedTip).toHaveBeenCalledWith("opaque-1");
    await waitFor(() => expect(screen.queryByText("Cafe Lisboa")).not.toBeInTheDocument());
  });

  it("renders an empty shared tips state", async () => {
    mockedListSharedTips.mockResolvedValueOnce([]);

    render(<SharedTipsDialog open onOpenChange={() => undefined} />);

    expect(await screen.findByText("No shared tips")).toBeInTheDocument();
  });
});
