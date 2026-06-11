import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GenerationSection } from "./generation-section";
import { ToastProvider } from "@/components/ui/toast";
import { generateItinerary, getGenerationQuota } from "@/lib/api/trips";
import { ApiError } from "@/lib/api/client";
import { useGenerationDoc } from "./use-generation-doc";
import { fetchCategoryFreshness, fetchLatestGenerationId } from "./generation-data";
import {
  mockRunningGeneration,
  mockCompleteGeneration,
} from "@/lib/fixtures/generation";
import type { CompletionEntry, Participant } from "@/lib/api/types";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));
vi.mock("@/lib/api/trips", () => ({
  generateItinerary: vi.fn(),
  getGenerationQuota: vi.fn(),
}));
vi.mock("./use-generation-doc", () => ({ useGenerationDoc: vi.fn() }));
vi.mock("./generation-data", () => ({
  fetchLatestGenerationId: vi.fn(),
  fetchCategoryFreshness: vi.fn(),
}));

const participants: Participant[] = [
  { id: "p1", displayName: "Adam", claimedByUid: "uid-adam" },
  { id: "p2", displayName: "Mom", claimedByUid: null },
];

const completions: CompletionEntry[] = [
  {
    participantId: "p1",
    displayName: "Adam",
    claimedByUid: "uid-adam",
    filled: {
      food_drink: true,
      outdoors_scenic: true,
      nightlife: true,
      culture_local: true,
      logistics: true,
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

function renderSection(isAdmin = true) {
  return render(
    <ToastProvider>
      <GenerationSection
        tripId="trip-1"
        participants={participants}
        completions={completions}
        manualPlans={[]}
        isAdmin={isAdmin}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.mocked(generateItinerary).mockReset();
  vi.mocked(getGenerationQuota).mockResolvedValue({ cap: 3, usedToday: 0, remaining: 3 });
  vi.mocked(fetchCategoryFreshness).mockResolvedValue({});
  vi.mocked(useGenerationDoc).mockReturnValue({ doc: null, error: null, isStale: false });
});

describe("GenerationSection", () => {
  it("shows the preflight with all participants and starts a run on confirm", async () => {
    vi.mocked(fetchLatestGenerationId).mockResolvedValue(null);
    vi.mocked(generateItinerary).mockResolvedValue({ generationId: "gen-new" });
    renderSection();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Generate Itinerary/ }));

    // Preflight lists claimed + unclaimed travelers and the AI-fill summary.
    expect(await screen.findByText("Travelers")).toBeInTheDocument();
    expect(screen.getByText("Adam")).toBeInTheDocument();
    expect(screen.getByText("Mom")).toBeInTheDocument();
    expect(screen.getByText(/AI will fill:/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate itinerary" }));
    await waitFor(() => expect(generateItinerary).toHaveBeenCalledWith("trip-1", "groq"));
  });

  it("shows how many generations remain today", async () => {
    vi.mocked(fetchLatestGenerationId).mockResolvedValue(null);
    vi.mocked(getGenerationQuota).mockResolvedValue({ cap: 3, usedToday: 1, remaining: 2 });
    renderSection();

    expect(await screen.findByText("2 of 3 generations left today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate Itinerary/ })).toBeEnabled();
  });

  it("disables generation when the daily cap is exhausted", async () => {
    vi.mocked(fetchLatestGenerationId).mockResolvedValue(null);
    vi.mocked(getGenerationQuota).mockResolvedValue({ cap: 3, usedToday: 3, remaining: 0 });
    renderSection();

    expect(
      await screen.findByText(/Daily limit reached \(3 per day\)/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate Itinerary/ })).toBeDisabled();
  });

  it("locks the generate button for non-admins", async () => {
    vi.mocked(fetchLatestGenerationId).mockResolvedValue(null);
    renderSection(false);

    expect(
      await screen.findByRole("button", { name: /Generate Itinerary/ }),
    ).toBeDisabled();
    expect(generateItinerary).not.toHaveBeenCalled();
  });

  it("attaches to the in-flight run on a 409", async () => {
    vi.mocked(fetchLatestGenerationId).mockResolvedValue(null);
    vi.mocked(generateItinerary).mockRejectedValue(
      new ApiError({
        status: 409,
        code: "conflict",
        message: "already running",
        body: { generationId: "gen-running" } as never,
      }),
    );
    renderSection();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Generate Itinerary/ }));
    await user.click(await screen.findByRole("button", { name: "Generate itinerary" }));

    expect(await screen.findByText(/Attaching to the run already in progress/)).toBeInTheDocument();
  });

  it("renders the live progress panel while a run is in flight", async () => {
    vi.mocked(fetchLatestGenerationId).mockResolvedValue("gen-1");
    vi.mocked(useGenerationDoc).mockReturnValue({
      doc: mockRunningGeneration,
      error: null,
      isStale: false,
    });
    renderSection();

    expect(await screen.findByText("Generating your itinerary")).toBeInTheDocument();
    expect(screen.getByText(/Researching real venues/)).toBeInTheDocument();
  });

  it("surfaces generation listener contract mismatches", async () => {
    vi.mocked(fetchLatestGenerationId).mockResolvedValue("gen-1");
    vi.mocked(useGenerationDoc).mockReturnValue({
      doc: null,
      error: "Contract divergence in generation doc: itinerary.days is missing",
      isStale: false,
    });
    renderSection();

    expect(await screen.findByText("Generation contract mismatch")).toBeInTheDocument();
    expect(screen.getByText(/itinerary.days is missing/)).toBeInTheDocument();
  });

  it("renders the itinerary once the run completes", async () => {
    vi.mocked(fetchLatestGenerationId).mockResolvedValue("gen-1");
    vi.mocked(useGenerationDoc).mockReturnValue({
      doc: mockCompleteGeneration,
      error: null,
      isStale: false,
    });
    renderSection();

    expect(await screen.findByText("Your itinerary")).toBeInTheDocument();
    expect(screen.getByText("Café da Garagem")).toBeInTheDocument();
  });
});
