import type {
  Budget,
  MemberPreferences,
  PreferenceCategory,
} from "@/lib/api/types";

export function formatBudget(budget: Budget): string {
  const symbol = budget.currency === "CAD" ? "C$" : "$";
  return `~${symbol}${budget.amount} ${budget.currency}`;
}

export type PreferenceSummary = {
  /** Short human-readable chips for the filled, meaningful fields. */
  chips: string[];
  /** Trimmed free-text wishlist, empty string when none. */
  freeText: string;
  /** Trimmed comma-separated wishlist tags, empty when none. */
  wishlistTags: string[];
  /** True when the category has no meaningful content to show. */
  isEmpty: boolean;
};

const ENUM_LABELS: Record<string, string> = {
  // food_drink
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Kosher",
  gluten_free: "Gluten free",
  local_drinks: "Local drinks",
  cocktails: "Cocktails",
  coffee: "Coffee",
  // outdoors_scenic
  chill: "Chill",
  moderate: "Moderate",
  strenuous: "Strenuous",
  hikes: "Hikes",
  beaches: "Beaches",
  viewpoints: "Viewpoints",
  sunsets: "Sunsets",
  water_activities: "Water activities",
  parks: "Parks",
  // nightlife
  clubs: "Clubs",
  bars: "Bars",
  live_music: "Live music",
  street_parties: "Street parties",
  chill_drinks: "Chill drinks",
  once_or_twice: "1–2 nights",
  most_nights: "Most nights",
  // culture_local
  markets: "Markets",
  museums: "Museums",
  landmarks: "Landmarks",
  neighborhoods: "Neighborhoods",
  local_events: "Local events",
  side_quests: "Side quests",
  yes: "Tours: yes",
  no: "Tours: no",
  maybe: "Tours: maybe",
  // logistics
  relaxed: "Relaxed pace",
  balanced: "Balanced pace",
  packed: "Packed pace",
  early: "Early riser",
  mid: "Mid riser",
  late: "Late riser",
  walk: "Walk",
  transit: "Transit",
  rideshare: "Rideshare",
  rental_car: "Rental car",
};

function label(value: string): string {
  return ENUM_LABELS[value] ?? value;
}

/** Drop "none" sentinels and de-duplicate while keeping order. */
function meaningful(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (value === "none" || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function wishlistTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/**
 * Turn a single category's saved preferences into a compact, human-readable
 * summary: a handful of chips plus a free-text preview. Pure; safe for `null`.
 */
export function summarizeCategory<T extends PreferenceCategory>(
  category: T,
  prefs: MemberPreferences[T] | null | undefined,
): PreferenceSummary {
  const freeText = (prefs?.freeText ?? "").trim();
  const tags = wishlistTags(freeText);
  const chips: string[] = [];

  if (prefs) {
    switch (category) {
      case "food_drink": {
        const p = prefs as NonNullable<MemberPreferences["food_drink"]>;
        meaningful(p.dietaryRestrictions).forEach((v) => chips.push(label(v)));
        p.cuisineInterests
          .map((c) => c.trim())
          .filter(Boolean)
          .forEach((c) => chips.push(c));
        meaningful(p.drinkInterests).forEach((v) => chips.push(label(v)));
        if (p.mealBudget) chips.push(`Meals ${formatBudget(p.mealBudget)}`);
        if (p.sportsBarInterest) chips.push("Sports bars");
        break;
      }
      case "outdoors_scenic": {
        const p = prefs as NonNullable<MemberPreferences["outdoors_scenic"]>;
        if (p.activityLevel) chips.push(label(p.activityLevel));
        meaningful(p.interests).forEach((v) => chips.push(label(v)));
        if (p.photoSpotsPriority) chips.push("Photo spots");
        break;
      }
      case "nightlife": {
        const p = prefs as NonNullable<MemberPreferences["nightlife"]>;
        meaningful(p.vibe).forEach((v) => chips.push(label(v)));
        if (p.frequency && p.frequency !== "none") chips.push(label(p.frequency));
        if (p.budget) chips.push(`Budget ${formatBudget(p.budget)}`);
        break;
      }
      case "culture_local": {
        const p = prefs as NonNullable<MemberPreferences["culture_local"]>;
        meaningful(p.interests).forEach((v) => chips.push(label(v)));
        if (p.guidedTours) chips.push(label(p.guidedTours));
        break;
      }
      case "logistics": {
        const p = prefs as NonNullable<MemberPreferences["logistics"]>;
        if (p.pace) chips.push(label(p.pace));
        if (p.wakeTime) chips.push(label(p.wakeTime));
        meaningful(p.transport).forEach((v) => chips.push(label(v)));
        if (p.dailyBudget) chips.push(`Daily ${formatBudget(p.dailyBudget)}`);
        if (p.mobilityNotes.trim()) chips.push("Mobility notes");
        break;
      }
    }
  }

  return {
    chips,
    freeText,
    wishlistTags: tags,
    isEmpty: chips.length === 0 && tags.length === 0,
  };
}
