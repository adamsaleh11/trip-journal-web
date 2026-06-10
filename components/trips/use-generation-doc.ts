"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GenerationDoc } from "@/lib/api/types";

/** No progress update for this long while running → surface the stale guard. */
export const STALE_AFTER_MS = 5 * 60 * 1000;
/** Keep the listener this long after completion, then detach (cost rule). */
export const DETACH_AFTER_MS = 5 * 1000;

type UseGenerationDoc = {
  doc: GenerationDoc | null;
  error: string | null;
  isStale: boolean;
};

/**
 * Realtime listener for a single generation doc (contract §5.2). Holds the last
 * snapshot in state and detaches ~5s after the run completes/errors so a settled
 * itinerary keeps rendering without an open listener. Arms a 5-minute stale
 * guard while the run is still in flight.
 */
export function useGenerationDoc(
  tripId: string,
  generationId: string | null,
): UseGenerationDoc {
  const [generation, setGeneration] = useState<GenerationDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!generationId) {
      setGeneration(null);
      setError(null);
      setIsStale(false);
      return;
    }

    let unsub: (() => void) | null = null;
    let staleTimer: ReturnType<typeof setTimeout> | undefined;
    let detachTimer: ReturnType<typeof setTimeout> | undefined;

    const clearTimers = () => {
      if (staleTimer) clearTimeout(staleTimer);
      if (detachTimer) clearTimeout(detachTimer);
    };

    unsub = onSnapshot(
      doc(db, "trips", tripId, "generations", generationId),
      (snapshot) => {
        clearTimers();
        setIsStale(false);

        if (!snapshot.exists()) {
          setGeneration(null);
          return;
        }

        const rawData = snapshot.data();
        const divergence = getGenerationContractDivergence(rawData);
        if (divergence) {
          setGeneration(null);
          setError(`Contract divergence in generation doc: ${divergence}`);
          return;
        }

        const data = rawData as GenerationDoc;
        setError(null);
        setGeneration(data);

        if (data.status === "running") {
          staleTimer = setTimeout(() => setIsStale(true), STALE_AFTER_MS);
        } else {
          // complete or error: settle, then release the listener.
          detachTimer = setTimeout(() => {
            unsub?.();
            unsub = null;
          }, DETACH_AFTER_MS);
        }
      },
      (err) => {
        setError(err instanceof Error ? err.message : "Lost connection to the run.");
      },
    );

    return () => {
      clearTimers();
      unsub?.();
      unsub = null;
    };
  }, [tripId, generationId]);

  return { doc: generation, error, isStale };
}

const GENERATION_STATUSES = ["running", "complete", "error"] as const;
const GENERATION_PHASES = [
  "collecting_preferences",
  "researching",
  "building_itinerary",
  "done",
] as const;
const CATEGORY_AGENT_STATUSES = [
  "pending",
  "running",
  "done",
  "skipped_fresh",
  "fallback",
  "error",
] as const;
const COORDINATOR_STATUSES = ["pending", "running", "done", "error"] as const;
const AGENT_KEYS = [
  "food_drink",
  "outdoors_scenic",
  "nightlife",
  "culture_local",
  "logistics",
] as const;

function getGenerationContractDivergence(value: unknown): string | null {
  if (!isRecord(value)) return "doc is not an object";
  if (!isOneOf(value.status, GENERATION_STATUSES)) return "status is missing or unknown";
  if (!isOneOf(value.phase, GENERATION_PHASES)) return "phase is missing or unknown";
  if (!isRecord(value.agentStatuses)) return "agentStatuses is missing";

  for (const key of AGENT_KEYS) {
    if (!isOneOf(value.agentStatuses[key], CATEGORY_AGENT_STATUSES)) {
      return `agentStatuses.${key} is missing or unknown`;
    }
  }

  if (!isOneOf(value.agentStatuses.coordinator, COORDINATOR_STATUSES)) {
    return "agentStatuses.coordinator is missing or unknown";
  }

  if (value.status === "complete") {
    if (!isRecord(value.itinerary)) return "complete doc is missing itinerary";
    const itineraryDivergence = getItineraryContractDivergence(value.itinerary);
    if (itineraryDivergence) return itineraryDivergence;
  }

  return null;
}

function getItineraryContractDivergence(itinerary: Record<string, unknown>): string | null {
  if (!Array.isArray(itinerary.days)) return "itinerary.days is missing";

  for (const [dayIndex, day] of itinerary.days.entries()) {
    if (!isRecord(day)) return `itinerary.days[${dayIndex}] is not an object`;
    if (!Array.isArray(day.blocks)) return `itinerary.days[${dayIndex}].blocks is missing`;

    for (const [blockIndex, block] of day.blocks.entries()) {
      if (!isRecord(block)) {
        return `itinerary.days[${dayIndex}].blocks[${blockIndex}] is not an object`;
      }
      if (typeof block.name !== "string") {
        return `itinerary.days[${dayIndex}].blocks[${blockIndex}].name is missing`;
      }
      if (!Array.isArray(block.stops)) {
        return `itinerary.days[${dayIndex}].blocks[${blockIndex}].stops is missing`;
      }

      for (const [stopIndex, stop] of block.stops.entries()) {
        if (!isRecord(stop)) {
          return `itinerary.days[${dayIndex}].blocks[${blockIndex}].stops[${stopIndex}] is not an object`;
        }
        if (stop.transport !== undefined && stop.transport !== null && !isRecord(stop.transport)) {
          return `itinerary.days[${dayIndex}].blocks[${blockIndex}].stops[${stopIndex}].transport must be an object or null`;
        }
      }
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}
