import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RightNowProvider, useRightNow } from "@/components/right-now/right-now-provider";
import { RightNowTripCard } from "@/components/right-now/right-now-trip-card";
import { createWhim } from "@/lib/api/whims";
import type { WhimCreated } from "@/lib/api/types";

vi.mock("@/lib/api/whims", () => ({
  createWhim: vi.fn(),
}));

const mockedCreateWhim = vi.mocked(createWhim);

function TestLauncher() {
  const { openRightNow } = useRightNow();

  return (
    <button type="button" onClick={() => openRightNow()}>
      Right Now
    </button>
  );
}

function renderRightNow(children = <TestLauncher />) {
  return render(<RightNowProvider>{children}</RightNowProvider>);
}

function suggestion(overrides: Partial<WhimCreated["suggestion"]> = {}): WhimCreated {
  const placeId = overrides.placeId ?? "places/gelato";

  return {
    whimId: `whim-${placeId}`,
    suggestion: {
      placeId,
      name: "Moonlight Gelato",
      address: "12 King St",
      lat: 43.65,
      lng: -79.38,
      category: "dessert",
      whyThis: "It is close, casual, and still open.",
      openNow: true,
      mapsUri: `https://maps.example/${placeId}`,
      ...overrides,
    },
  };
}

function mockGeolocationSuccess() {
  const getCurrentPosition = vi.fn((success: PositionCallback) => {
    success({
      coords: {
        latitude: 43.65,
        longitude: -79.38,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    });
  });

  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });

  return getCurrentPosition;
}

function mockGeolocationDenied() {
  const getCurrentPosition = vi.fn(
    (_success: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
    },
  );

  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
}

describe("RightNowProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("opens from the global launcher and submits an empty whim with geolocation", async () => {
    mockGeolocationSuccess();
    mockedCreateWhim.mockResolvedValueOnce(suggestion());

    renderRightNow();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Right Now" }));
    await user.click(screen.getByRole("button", { name: "Roll" }));

    expect(mockedCreateWhim).toHaveBeenCalledWith({
      whimText: "",
      location: { lat: 43.65, lng: -79.38 },
    });
    expect(await screen.findByText("Moonlight Gelato")).toBeInTheDocument();
    expect(screen.getByText("Open now")).toBeInTheDocument();
  });

  it("uses typed city fallback after geolocation denial and remembers the city", async () => {
    mockGeolocationDenied();
    mockedCreateWhim.mockResolvedValueOnce(suggestion({ name: "Queen West Arcade" }));

    renderRightNow();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Right Now" }));
    await user.click(screen.getByRole("button", { name: "Roll" }));
    await user.type(await screen.findByLabelText("City"), "Toronto");
    await user.click(screen.getByRole("button", { name: "Roll" }));

    expect(mockedCreateWhim).toHaveBeenCalledWith({
      whimText: "",
      location: { city: "Toronto" },
    });
    expect(window.localStorage.getItem("trip-journal-right-now-city")).toBe("Toronto");
    expect(await screen.findByText("Queen West Arcade")).toBeInTheDocument();
  });

  it("attaches trip context and renders travelers tips distinctly", async () => {
    mockGeolocationSuccess();
    mockedCreateWhim.mockResolvedValueOnce(
      suggestion({
        travelersTip: "Ask for the upstairs table if it is free.",
      }),
    );

    renderRightNow(<RightNowTripCard tripId="trip-1" destinationText="Lisbon" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Right Now" }));
    await user.type(screen.getByLabelText("Mood"), "somewhere cozy");
    await user.click(screen.getByRole("button", { name: "Roll" }));

    expect(mockedCreateWhim).toHaveBeenCalledWith({
      whimText: "somewhere cozy",
      location: { lat: 43.65, lng: -79.38 },
      tripId: "trip-1",
    });
    expect(await screen.findByText("Ask for the upstairs table if it is free.")).toBeInTheDocument();
  });

  it("shows a recoverable no-results state", async () => {
    mockGeolocationSuccess();
    mockedCreateWhim.mockRejectedValueOnce({
      status: 404,
      code: "not_found",
      message: "No matching places",
    });

    renderRightNow();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Right Now" }));
    await user.type(screen.getByLabelText("Mood"), "indoor skydiving for toddlers");
    await user.click(screen.getByRole("button", { name: "Roll" }));

    expect(await screen.findByText("Nothing nearby for that. Try another mood.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("rerolls with accumulated exclusions and restores a previous suggestion", async () => {
    mockGeolocationSuccess();
    mockedCreateWhim
      .mockResolvedValueOnce(suggestion({ placeId: "places/first", name: "First Cafe" }))
      .mockResolvedValueOnce(suggestion({ placeId: "places/second", name: "Second Records" }));

    renderRightNow();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Right Now" }));
    await user.click(screen.getByRole("button", { name: "Roll" }));
    expect(await screen.findByText("First Cafe")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Another one" }));

    expect(mockedCreateWhim).toHaveBeenLastCalledWith({
      whimText: "",
      location: { lat: 43.65, lng: -79.38 },
      excludePlaceIds: ["places/first"],
    });
    expect(await screen.findByText("Second Records")).toBeInTheDocument();

    const history = screen.getByLabelText("Rejected suggestions");
    await user.click(within(history).getByRole("button", { name: /First Cafe/ }));
    expect(screen.getByText("First Cafe")).toBeInTheDocument();
  });
});
