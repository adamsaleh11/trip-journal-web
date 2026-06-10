import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ManualPlansSection } from "./manual-plans-section";
import { ToastProvider } from "@/components/ui/toast";
import { createManualPlan } from "@/lib/api/trips";
import type { ManualPlan } from "@/lib/api/types";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));
vi.mock("@/lib/api/trips", () => ({
  createManualPlan: vi.fn(),
  updateManualPlan: vi.fn(),
  deleteManualPlan: vi.fn(),
}));

const plans: ManualPlan[] = [
  {
    id: "mp1",
    category: "food_drink",
    activity: "Dinner at Time Out Market",
    timeOfDay: "evening",
    date: "2026-07-11",
    address: "Av. 24 de Julho 49, Lisbon",
    notes: "Book the earlier dinner slot.",
    createdByUid: "uid-adam",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
  },
];

function renderSection(isAdmin: boolean, manualPlans: ManualPlan[] = plans) {
  return render(
    <ToastProvider>
      <ManualPlansSection
        tripId="trip-1"
        manualPlans={manualPlans}
        isAdmin={isAdmin}
        onManualPlansChanged={vi.fn()}
        tripStartDate="2026-07-10"
        tripEndDate="2026-07-13"
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.mocked(createManualPlan).mockReset();
});

describe("ManualPlansSection", () => {
  it("lets an admin create a plan with guided category/activity/segmented time-of-day", async () => {
    vi.mocked(createManualPlan).mockResolvedValue({ ...plans[0], id: "mp2" });
    renderSection(true);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Add Plan/ }));
    await user.selectOptions(screen.getByLabelText("Category *"), "nightlife");
    await user.type(screen.getByLabelText("Activity Name *"), "Fado night");
    await user.click(screen.getByRole("radio", { name: "Evening" }));
    await user.click(screen.getByRole("button", { name: "Save Plan" }));

    await waitFor(() => expect(createManualPlan).toHaveBeenCalledTimes(1));
    expect(createManualPlan).toHaveBeenCalledWith(
      "trip-1",
      expect.objectContaining({
        category: "nightlife",
        activity: "Fado night",
        timeOfDay: "evening",
      }),
    );
  });

  it("blocks a date outside the trip range", async () => {
    renderSection(true);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Add Plan/ }));
    await user.selectOptions(screen.getByLabelText("Category *"), "culture_local");
    await user.type(screen.getByLabelText("Activity Name *"), "Museum visit");
    await user.click(screen.getByRole("radio", { name: "Morning" }));
    await user.type(screen.getByLabelText(/Date/), "2026-07-20");

    expect(screen.getByText(/within the trip/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Plan" })).toBeDisabled();
    expect(createManualPlan).not.toHaveBeenCalled();
  });

  it("is read-only for non-admin members", () => {
    renderSection(false);
    expect(screen.getByText("Dinner at Time Out Market")).toBeInTheDocument();
    expect(screen.getByText("Av. 24 de Julho 49, Lisbon")).toBeInTheDocument();
    expect(screen.getByText("Book the earlier dinner slot.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Plan/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });
});
