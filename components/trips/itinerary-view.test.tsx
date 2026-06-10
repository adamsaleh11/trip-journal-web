import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItineraryView } from "./itinerary-view";
import {
  mockCompleteItinerary,
  mockCompleteGeneration,
} from "@/lib/fixtures/generation";
import type { TripItinerary } from "@/lib/api/types";

describe("ItineraryView", () => {
  it("renders day headings, blocks, and every stop field", () => {
    render(
      <ItineraryView
        itinerary={mockCompleteItinerary}
        metrics={mockCompleteGeneration.metrics}
      />,
    );

    expect(screen.getByText(/Day 1 — /)).toBeInTheDocument();
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Evening")).toBeInTheDocument();

    expect(screen.getByText("Café da Garagem")).toBeInTheDocument();
    expect(screen.getByText("Costa do Castelo 75, Lisbon")).toBeInTheDocument();
    expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Walk · 8 min")).toBeInTheDocument();
    expect(
      screen.getByText(/Quiet viewpoint café matching the relaxed morning pace/),
    ).toBeInTheDocument();
  });

  it("shows the AI-suggested badge only on suggested stops", () => {
    render(<ItineraryView itinerary={mockCompleteItinerary} />);
    // Only São Jorge Castle is suggested in the fixture.
    expect(screen.getAllByText("AI-suggested")).toHaveLength(1);
  });

  it("renders 'Not available' for a stop with no transport", () => {
    render(<ItineraryView itinerary={mockCompleteItinerary} />);
    // São Jorge Castle has transport: null.
    expect(screen.getByText("Not available")).toBeInTheDocument();
  });

  it("renders the metrics footer from the run metrics", () => {
    render(
      <ItineraryView
        itinerary={mockCompleteItinerary}
        metrics={mockCompleteGeneration.metrics}
      />,
    );
    expect(screen.getByText(/Generated in 26\.4s/)).toBeInTheDocument();
    expect(screen.getByText(/~48,200 tokens/)).toBeInTheDocument();
  });

  it("confirms before regenerating", async () => {
    const onRegenerate = vi.fn();
    render(
      <ItineraryView itinerary={mockCompleteItinerary} onRegenerate={onRegenerate} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Regenerate/ }));
    expect(
      screen.getByText(/replaces the current itinerary. Previous runs are kept/),
    ).toBeInTheDocument();
    expect(onRegenerate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("surfaces manual plan warnings", () => {
    const itinerary: TripItinerary = {
      ...mockCompleteItinerary,
      manualPlanWarnings: [
        { manualPlanId: "mp1", activity: "Sunset sailing", reason: "no slot on the chosen date" },
      ],
    };
    render(<ItineraryView itinerary={itinerary} />);
    expect(screen.getByText(/couldn't be scheduled/)).toBeInTheDocument();
    expect(screen.getByText("Sunset sailing")).toBeInTheDocument();
  });
});
