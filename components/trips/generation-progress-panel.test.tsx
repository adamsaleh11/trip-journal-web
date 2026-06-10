import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GenerationProgressPanel } from "./generation-progress-panel";
import {
  mockPendingGeneration,
  mockRunningGeneration,
  mockCompleteGeneration,
  mockErrorGeneration,
} from "@/lib/fixtures/generation";

describe("GenerationProgressPanel", () => {
  it("renders all six agents as waiting in the pending state", () => {
    render(<GenerationProgressPanel doc={mockPendingGeneration} />);

    expect(screen.getByText("Food & Drink")).toBeInTheDocument();
    expect(screen.getByText("Outdoors & Scenic")).toBeInTheDocument();
    expect(screen.getByText("Nightlife")).toBeInTheDocument();
    expect(screen.getByText("Culture & Local")).toBeInTheDocument();
    expect(screen.getByText("Logistics")).toBeInTheDocument();
    expect(screen.getByText("Itinerary Coordinator")).toBeInTheDocument();
    expect(screen.getAllByText("Waiting")).toHaveLength(6);
    expect(screen.getByText(/Collecting everyone's preferences/)).toBeInTheDocument();
  });

  it("reflects mixed running/done/reused states with the researching phase label", () => {
    render(<GenerationProgressPanel doc={mockRunningGeneration} />);

    expect(screen.getByText(/Researching real venues/)).toBeInTheDocument();
    expect(screen.getAllByText("Running")).toHaveLength(2); // nightlife + culture
    expect(screen.getByText("Done")).toBeInTheDocument(); // food_drink
    expect(screen.getByText("Reused")).toBeInTheDocument(); // outdoors skipped_fresh
  });

  it("renders done and fallback markers on completion", () => {
    render(<GenerationProgressPanel doc={mockCompleteGeneration} />);

    expect(screen.getByText("Reused")).toBeInTheDocument();
    expect(screen.getByText("Fallback")).toBeInTheDocument();
    // coordinator + several done
    expect(screen.getAllByText("Done").length).toBeGreaterThanOrEqual(3);
  });

  it("renders the error path with a working retry", async () => {
    const onRetry = vi.fn();
    render(<GenerationProgressPanel doc={mockErrorGeneration} onRetry={onRetry} />);

    expect(screen.getByText(/ran out of retries/)).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Retry generation/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows a stale warning with retry when the run stalls", async () => {
    const onRetry = vi.fn();
    render(
      <GenerationProgressPanel doc={mockRunningGeneration} isStale onRetry={onRetry} />,
    );

    expect(screen.getByText(/taking longer than expected/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
