import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TripDetailPage from "./page";
import { ToastProvider } from "@/components/ui/toast";
import {
  completeTrip,
  getPreferenceStatus,
  getTrip,
  listJournalEntries,
  listManualPlans,
  listMembers,
  listParticipants,
} from "@/lib/api/trips";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "trip-1" }),
}));

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ user: { uid: "user-admin" } }),
}));

vi.mock("@/components/trips/trip-travelers-section", () => ({
  TripTravelersSection: () => <div>Travelers section</div>,
}));
vi.mock("@/components/trips/manual-plans-section", () => ({
  ManualPlansSection: () => <div>Manual plans section</div>,
}));
vi.mock("@/components/trips/category-panels-section", () => ({
  CategoryPanelsSection: () => <div>Category panels section</div>,
}));
vi.mock("@/components/trips/generation-section", () => ({
  GenerationSection: () => <div>Generation section</div>,
}));
vi.mock("@/components/right-now/right-now-trip-card", () => ({
  RightNowTripCard: () => <div>Right Now trip card</div>,
}));
vi.mock("@/components/preferences/preferences-section", () => ({
  PreferencesSection: () => <div>Preferences section</div>,
}));

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor({ status, message }: { status: number; message?: string }) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/api/trips", () => ({
  completeTrip: vi.fn(),
  getPreferenceStatus: vi.fn(),
  getTrip: vi.fn(),
  listJournalEntries: vi.fn(),
  listManualPlans: vi.fn(),
  listMembers: vi.fn(),
  listParticipants: vi.fn(),
}));

const generatedTrip = {
  id: "trip-1",
  name: "Lisbon Weekend",
  destination: { text: "Lisbon, Portugal", lat: 38.72, lng: -9.14 },
  startDate: "2026-07-10",
  endDate: "2026-07-13",
  lodgingArea: "Alfama",
  status: "generated" as const,
  adminUid: "user-admin",
  createdAt: "2026-06-10T00:00:00+00:00",
};

const completedTrip = { ...generatedTrip, status: "completed" as const };

function renderPage() {
  return render(
    <ToastProvider>
      <TripDetailPage />
    </ToastProvider>,
  );
}

describe("TripDetailPage journal completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listMembers).mockResolvedValue([
      {
        uid: "user-admin",
        displayName: "Ada",
        role: "admin",
        joinedAt: "2026-06-10T00:00:00+00:00",
      },
    ]);
    vi.mocked(listParticipants).mockResolvedValue([]);
    vi.mocked(getPreferenceStatus).mockResolvedValue([]);
    vi.mocked(listManualPlans).mockResolvedValue([]);
  });

  it("lets an admin complete a generated trip and renders journal entries after reload", async () => {
    vi.mocked(getTrip).mockResolvedValueOnce(generatedTrip).mockResolvedValueOnce(completedTrip);
    vi.mocked(completeTrip).mockResolvedValueOnce(completedTrip);
    vi.mocked(listJournalEntries).mockResolvedValueOnce([
      {
        id: "places/cafe",
        placeId: "places/cafe",
        name: "Cafe Lisboa",
        category: "food_drink",
        address: "Rua A",
        source: "participant_preference",
        myEntry: null,
      },
    ]);

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Complete trip" }));
    expect(screen.getByText("Complete this trip?")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Complete trip" }).at(-1)!);

    expect(completeTrip).toHaveBeenCalledWith("trip-1");
    await waitFor(() => expect(listJournalEntries).toHaveBeenCalledWith("trip-1"));
    expect(await screen.findByText("Journal")).toBeInTheDocument();
    expect(screen.getByText("Cafe Lisboa")).toBeInTheDocument();
  });
});
