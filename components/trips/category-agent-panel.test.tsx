import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CategoryAgentPanel } from "./category-agent-panel";
import { ToastProvider } from "@/components/ui/toast";
import { generateCategory } from "@/lib/api/trips";
import { ApiError } from "@/lib/api/client";
import { useCategoryResult } from "./use-category-result";
import type { CategoryResult } from "@/lib/api/types";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));
vi.mock("@/lib/api/trips", () => ({ generateCategory: vi.fn() }));
vi.mock("./use-category-result", () => ({ useCategoryResult: vi.fn() }));

const goLive = vi.fn();

function mockResult(result: CategoryResult | null, error: string | null = null) {
  vi.mocked(useCategoryResult).mockReturnValue({ result, error, goLive });
}

function renderPanel(
  category: "food_drink" | "nightlife" = "food_drink",
  label = "Food & Drink",
  isAdmin = true,
) {
  return render(
    <ToastProvider>
      <CategoryAgentPanel
        tripId="trip-1"
        category={category}
        label={label}
        isAdmin={isAdmin}
      />
    </ToastProvider>,
  );
}

const completeResult: CategoryResult = {
  status: "complete",
  candidates: [
    {
      placeId: "p1",
      name: "Time Out Market",
      address: "Av. 24 de Julho",
      lat: 0,
      lng: 0,
      whyItFits: "Matches the group's love of local food halls.",
      timeOfDayFit: "lunch",
      priceLevel: "$$",
      suggested: false,
      travelersTip: "Go before noon to beat the crowd.",
    },
    {
      placeId: "p2",
      name: "A Cevicheria",
      address: "R. Dom Pedro V",
      lat: 0,
      lng: 0,
      whyItFits: "A padded pick to round out options.",
      suggested: true,
    },
  ],
  sourceParticipantIds: ["p1"],
  metrics: { latencyMs: 4200, totalTokens: 5300 },
  traceId: "t",
  updatedAt: "2026-06-10T00:00:00Z",
  stale: false,
};

beforeEach(() => {
  vi.mocked(generateCategory).mockReset();
  goLive.mockReset();
});

describe("CategoryAgentPanel", () => {
  it("renders all candidate fields and the AI-suggested badge only where suggested", () => {
    mockResult(completeResult);
    renderPanel();

    expect(screen.getByText("Time Out Market")).toBeInTheDocument();
    expect(screen.getByText("Av. 24 de Julho")).toBeInTheDocument();
    expect(screen.getByText("lunch")).toBeInTheDocument();
    expect(screen.getByText("$$")).toBeInTheDocument();
    expect(
      screen.getByText("Matches the group's love of local food halls."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Go before noon/)).toBeInTheDocument();

    // Exactly one AI-suggested badge (only the second candidate).
    expect(screen.getAllByText("AI-suggested")).toHaveLength(1);
    // Metrics summary
    expect(screen.getByText(/2 picks/)).toBeInTheDocument();
    expect(screen.getByText(/4\.2s/)).toBeInTheDocument();
  });

  it("shows a stale hint when the result is stale", () => {
    mockResult({ ...completeResult, stale: true });
    renderPanel();
    expect(screen.getByText(/Preferences changed since this ran/)).toBeInTheDocument();
  });

  it("renders the agent error state", () => {
    mockResult({
      ...completeResult,
      status: "error",
      candidates: [],
      error: "The research agent hit a snag.",
    });
    renderPanel();
    expect(screen.getByText("The research agent hit a snag.")).toBeInTheDocument();
  });

  it("shows a not-run-yet state with no result", () => {
    mockResult(null);
    renderPanel();
    expect(screen.getByText("Not run yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run agent/ })).toBeInTheDocument();
  });

  it("runs only its own category and goes live", async () => {
    mockResult(null);
    vi.mocked(generateCategory).mockResolvedValue({ category: "nightlife" });
    renderPanel("nightlife", "Nightlife");

    await userEvent.click(screen.getByRole("button", { name: /Run agent/ }));

    expect(generateCategory).toHaveBeenCalledTimes(1);
    expect(generateCategory).toHaveBeenCalledWith("trip-1", "nightlife");
    await waitFor(() => expect(goLive).toHaveBeenCalled());
  });

  it("locks the run button for non-admins", async () => {
    mockResult(null);
    renderPanel("food_drink", "Food & Drink", false);

    const button = screen.getByRole("button", { name: /Run agent/ });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(generateCategory).not.toHaveBeenCalled();
  });

  it("collapses and re-expands the panel content via the toggle button", async () => {
    mockResult(completeResult);
    renderPanel();

    const toggle = screen.getByRole("button", { name: "Collapse Food & Drink" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Time Out Market")).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAccessibleName("Expand Food & Drink");
    expect(screen.queryByText("Time Out Market")).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(screen.getByText("Time Out Market")).toBeInTheDocument();
  });

  it("keeps the run button usable while collapsed", async () => {
    mockResult(null);
    vi.mocked(generateCategory).mockResolvedValue({ category: "food_drink" });
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Collapse Food & Drink" }));
    expect(screen.queryByText("Not run yet.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Run agent/ }));
    expect(generateCategory).toHaveBeenCalledWith("trip-1", "food_drink");
  });

  it("treats a 409 as already-running, not an error", async () => {
    mockResult(null);
    vi.mocked(generateCategory).mockRejectedValue(
      new ApiError({ status: 409, code: "conflict", message: "running", body: null }),
    );
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /Run agent/ }));

    await waitFor(() => expect(goLive).toHaveBeenCalled());
    expect(await screen.findByText("Already running")).toBeInTheDocument();
    expect(screen.queryByText(/Failed to start/)).not.toBeInTheDocument();
  });
});
