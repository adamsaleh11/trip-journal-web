import type { GenerationDoc, TripItinerary } from "@/lib/api/types";

/**
 * Hand-written mock generations docs matching contract §5.2, used to build the
 * progress panel + itinerary view before the live backend (T3.2) lands and to
 * drive the state-walk tests.
 */

const TRACE = "trace-mock-1";
const STARTED = "2026-06-10T09:00:00Z";

export const mockPendingGeneration: GenerationDoc = {
  status: "running",
  phase: "collecting_preferences",
  agentStatuses: {
    food_drink: "pending",
    outdoors_scenic: "pending",
    nightlife: "pending",
    culture_local: "pending",
    logistics: "pending",
    coordinator: "pending",
  },
  requestedBy: "uid-adam",
  startedAt: STARTED,
  traceId: TRACE,
};

export const mockRunningGeneration: GenerationDoc = {
  ...mockPendingGeneration,
  phase: "researching",
  agentStatuses: {
    food_drink: "done",
    outdoors_scenic: "skipped_fresh",
    nightlife: "running",
    culture_local: "running",
    logistics: "pending",
    coordinator: "pending",
  },
};

export const mockCompleteItinerary: TripItinerary = {
  days: [
    {
      date: "2026-07-10",
      title: "Day 1",
      blocks: [
        {
          name: "morning",
          stops: [
            {
              time: "9:00 AM",
              placeId: "p-cafe",
              name: "Café da Garagem",
              address: "Costa do Castelo 75, Lisbon",
              category: "food_drink",
              transport: { mode: "Walk", durationText: "8 min" },
              whyItFits: "Quiet viewpoint café matching the relaxed morning pace.",
              suggested: false,
            },
            {
              time: "10:30 AM",
              placeId: "p-castle",
              name: "São Jorge Castle",
              address: "R. de Santa Cruz do Castelo, Lisbon",
              category: "culture_local",
              transport: null,
              whyItFits: "Top landmark pick from the group's culture preferences.",
              suggested: true,
            },
          ],
        },
        {
          name: "evening",
          stops: [
            {
              time: "8:00 PM",
              placeId: "p-fado",
              name: "A Tasca do Chico",
              address: "R. do Diário de Notícias 39, Lisbon",
              category: "nightlife",
              transport: { mode: "Rideshare", durationText: "12 min" },
              whyItFits: "Intimate fado night honoring the manual plan.",
              suggested: false,
            },
          ],
        },
      ],
    },
  ],
  manualPlanWarnings: [],
};

export const mockCompleteGeneration: GenerationDoc = {
  status: "complete",
  phase: "done",
  agentStatuses: {
    food_drink: "done",
    outdoors_scenic: "skipped_fresh",
    nightlife: "done",
    culture_local: "done",
    logistics: "fallback",
    coordinator: "done",
  },
  requestedBy: "uid-adam",
  startedAt: STARTED,
  traceId: TRACE,
  itinerary: mockCompleteItinerary,
  metrics: {
    totalTokens: 48200,
    promptTokens: 31000,
    outputTokens: 17200,
    latencyMs: 26400,
    estCostUsd: 0.04,
    llmCalls: 7,
    toolCalls: 12,
    tokensPerSecond: 18.2,
    billingTier: "free",
  },
};

export const mockErrorGeneration: GenerationDoc = {
  status: "error",
  phase: "researching",
  agentStatuses: {
    food_drink: "done",
    outdoors_scenic: "done",
    nightlife: "error",
    culture_local: "pending",
    logistics: "pending",
    coordinator: "pending",
  },
  requestedBy: "uid-adam",
  startedAt: STARTED,
  traceId: TRACE,
  error: "The nightlife agent ran out of retries. Please try again.",
};

/** Ordered walk used by the progress-panel state test. */
export const mockGenerationWalk: GenerationDoc[] = [
  mockPendingGeneration,
  mockRunningGeneration,
  mockCompleteGeneration,
];
