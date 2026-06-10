import type { Destination } from "@/lib/api/types";

export type DestinationSuggestion = Destination & {
  id: string;
};

type MapboxFeature = {
  id: string;
  place_name?: string;
  text?: string;
  center?: [number, number];
  properties?: {
    mapbox_id?: string;
  };
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

export async function searchDestinations(query: string, signal?: AbortSignal) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token || query.trim().length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    access_token: token,
    autocomplete: "true",
    limit: "5",
    types: "place,locality,neighborhood,region,country",
  });

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query.trim(),
    )}.json?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Destination search is unavailable.");
  }

  const body = (await response.json()) as MapboxResponse;

  return (body.features ?? [])
    .filter((feature) => feature.center?.length === 2)
    .map((feature) => ({
      id: feature.id,
      text: feature.place_name ?? feature.text ?? "Selected destination",
      lng: feature.center?.[0] ?? 0,
      lat: feature.center?.[1] ?? 0,
      placeId: feature.properties?.mapbox_id ?? feature.id,
    })) satisfies DestinationSuggestion[];
}
