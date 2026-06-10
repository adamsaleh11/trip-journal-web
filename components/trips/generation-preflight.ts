import type {
  CompletionEntry,
  ManualPlan,
  Participant,
  PreferenceCategory,
} from "@/lib/api/types";

export const CATEGORY_LABELS: Record<PreferenceCategory, string> = {
  food_drink: "Food & Drink",
  outdoors_scenic: "Outdoors & Scenic",
  nightlife: "Nightlife",
  culture_local: "Culture & Local",
  logistics: "Logistics",
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as PreferenceCategory[];

/** Per-category freshness read from the categoryResults docs at preflight time. */
export type CategoryFreshness = Partial<
  Record<PreferenceCategory, { exists: boolean; stale: boolean }>
>;

export type PreflightParticipant = {
  participantId: string;
  displayName: string;
  isClaimed: boolean;
  emptyCategoryLabels: string[];
};

export type PreflightCategory = {
  category: PreferenceCategory;
  label: string;
  /** Hedged estimate — the backend makes the final skipped_fresh call. */
  likelyReused: boolean;
};

export type Preflight = {
  participants: PreflightParticipant[];
  categories: PreflightCategory[];
  manualPlans: ManualPlan[];
};

/**
 * Compose the Generate-Itinerary preflight from already-loaded trip data.
 *
 * Includes every participant (claimed + unclaimed) keyed by the completion
 * matrix, lists their empty categories ("AI will fill"), gives a hedged
 * per-category reuse estimate, and carries manual plans through separately as
 * mandatory itinerary context.
 */
export function buildPreflight(
  completions: CompletionEntry[],
  participants: Participant[],
  manualPlans: ManualPlan[],
  freshness: CategoryFreshness,
): Preflight {
  const claimedById = new Map(participants.map((p) => [p.id, Boolean(p.claimedByUid)]));

  const preflightParticipants: PreflightParticipant[] = completions.map((entry) => ({
    participantId: entry.participantId,
    displayName: entry.displayName ?? "Unnamed traveler",
    isClaimed: claimedById.get(entry.participantId) ?? Boolean(entry.claimedByUid),
    emptyCategoryLabels: CATEGORY_ORDER.filter(
      (category) => !entry.filled[category],
    ).map((category) => CATEGORY_LABELS[category]),
  }));

  const categories: PreflightCategory[] = CATEGORY_ORDER.map((category) => {
    const state = freshness[category];
    return {
      category,
      label: CATEGORY_LABELS[category],
      likelyReused: Boolean(state?.exists && !state.stale),
    };
  });

  return {
    participants: preflightParticipants,
    categories,
    manualPlans,
  };
}
