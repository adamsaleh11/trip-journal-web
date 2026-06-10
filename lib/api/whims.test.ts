import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { createWhim } from "@/lib/api/whims";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("whim API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts a whim request to the synchronous whims endpoint", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      whimId: "whim-1",
      suggestion: {
        placeId: "places/1",
        name: "Moonlight Gelato",
        address: "12 King St",
        lat: 43.65,
        lng: -79.38,
        category: "dessert",
        whyThis: "It is close and still open.",
        openNow: true,
        mapsUri: "https://maps.example/places/1",
      },
    });

    await createWhim({
      whimText: "",
      location: { lat: 43.65, lng: -79.38 },
      tripId: "trip-1",
      excludePlaceIds: ["places/old"],
    });

    expect(mockedApiFetch).toHaveBeenCalledWith("/whims", {
      method: "POST",
      body: {
        whimText: "",
        location: { lat: 43.65, lng: -79.38 },
        tripId: "trip-1",
        excludePlaceIds: ["places/old"],
      },
    });
  });
});
