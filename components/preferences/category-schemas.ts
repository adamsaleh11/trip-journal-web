import { z } from "zod";

export const BUDGET_MAX = 500;

export const budgetSchema = z.object({
  amount: z.number().int().min(0).max(BUDGET_MAX),
  currency: z.enum(["USD", "CAD"]),
});

export type BudgetValue = z.infer<typeof budgetSchema>;

// Older documents stored "$" / "$$" / "$$$"; map them onto the slider scale
// so saved preferences still hydrate the form.
const LEGACY_BUDGET_AMOUNTS: Record<string, number> = { $: 30, $$: 75, $$$: 150 };

export function normalizeBudget(value: unknown): BudgetValue | null {
  if (typeof value === "string") {
    const amount = LEGACY_BUDGET_AMOUNTS[value];
    return amount === undefined ? null : { amount, currency: "USD" };
  }
  const parsed = budgetSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const basePreferenceSchema = z.object({
  schemaVersion: z.literal(1),
  freeText: z.string().max(2000),
});

export const foodDrinkSchema = basePreferenceSchema.extend({
  dietaryRestrictions: z.array(z.enum(["vegetarian", "vegan", "halal", "kosher", "gluten_free", "none"])),
  cuisineInterests: z.array(z.string()),
  mealBudget: budgetSchema.nullable(),
  drinkInterests: z.array(z.enum(["local_drinks", "cocktails", "coffee", "none"])),
  sportsBarInterest: z.boolean(),
});

export const outdoorsScenicSchema = basePreferenceSchema.extend({
  activityLevel: z.enum(["chill", "moderate", "strenuous"]).nullable(),
  interests: z.array(
    z.enum(["hikes", "beaches", "viewpoints", "sunsets", "water_activities", "parks"])
  ),
  photoSpotsPriority: z.boolean(),
});

export const nightlifeSchema = basePreferenceSchema.extend({
  vibe: z.array(
    z.enum(["clubs", "bars", "live_music", "street_parties", "chill_drinks", "none"])
  ),
  frequency: z.enum(["none", "once_or_twice", "most_nights"]).nullable(),
  budget: budgetSchema.nullable(),
});

export const cultureLocalSchema = basePreferenceSchema.extend({
  interests: z.array(
    z.enum(["markets", "museums", "landmarks", "neighborhoods", "local_events", "side_quests"])
  ),
  guidedTours: z.enum(["yes", "no", "maybe"]).nullable(),
});

export const logisticsSchema = basePreferenceSchema.extend({
  pace: z.enum(["relaxed", "balanced", "packed"]).nullable(),
  wakeTime: z.enum(["early", "mid", "late"]).nullable(),
  transport: z.array(z.enum(["walk", "transit", "rideshare", "rental_car"])),
  dailyBudget: budgetSchema.nullable(),
  mobilityNotes: z.string().max(1000),
});

export type FoodDrinkFormValues = z.infer<typeof foodDrinkSchema>;
export type OutdoorsScenicFormValues = z.infer<typeof outdoorsScenicSchema>;
export type NightlifeFormValues = z.infer<typeof nightlifeSchema>;
export type CultureLocalFormValues = z.infer<typeof cultureLocalSchema>;
export type LogisticsFormValues = z.infer<typeof logisticsSchema>;
