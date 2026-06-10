import { apiFetch } from "@/lib/api/client";
import type { Destination } from "@/lib/api/types";

export type DestinationSuggestion = Destination & {
  id: string;
};

export function searchDestinations(query: string, signal?: AbortSignal) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return Promise.resolve([]);
  }

  return apiFetch<DestinationSuggestion[]>(
    `/places/search?query=${encodeURIComponent(normalizedQuery)}`,
    { signal },
  );
}
