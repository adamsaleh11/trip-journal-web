import { describe, expect, it } from "vitest";
import { summarizeCategory } from "./summary";
import type {
  FoodDrinkPreference,
  LogisticsPreference,
  NightlifePreference,
} from "@/lib/api/types";

describe("summarizeCategory", () => {
  it("returns an empty summary for null preferences", () => {
    const summary = summarizeCategory("food_drink", null);
    expect(summary.isEmpty).toBe(true);
    expect(summary.chips).toEqual([]);
    expect(summary.freeText).toBe("");
    expect(summary.wishlistTags).toEqual([]);
  });

  it("summarizes filled food & drink into readable chips", () => {
    const prefs: FoodDrinkPreference = {
      schemaVersion: 1,
      freeText: "  loves tapas  ",
      dietaryRestrictions: ["vegetarian", "none"],
      cuisineInterests: ["Portuguese", "  "],
      mealBudget: { amount: 75, currency: "USD" },
      drinkInterests: ["coffee", "none"],
      sportsBarInterest: true,
    };
    const summary = summarizeCategory("food_drink", prefs);

    expect(summary.isEmpty).toBe(false);
    expect(summary.chips).toEqual([
      "Vegetarian",
      "Portuguese",
      "Coffee",
      "Meals ~$75 USD",
      "Sports bars",
    ]);
    expect(summary.freeText).toBe("loves tapas");
    expect(summary.wishlistTags).toEqual(["loves tapas"]);
  });

  it("splits comma-separated specific wishes into separate tags", () => {
    const prefs: FoodDrinkPreference = {
      schemaVersion: 1,
      freeText: " steakhouse, local fruits,  ",
      dietaryRestrictions: [],
      cuisineInterests: [],
      mealBudget: null,
      drinkInterests: [],
      sportsBarInterest: false,
    };
    const summary = summarizeCategory("food_drink", prefs);

    expect(summary.isEmpty).toBe(false);
    expect(summary.freeText).toBe("steakhouse, local fruits,");
    expect(summary.wishlistTags).toEqual(["steakhouse", "local fruits"]);
  });

  it("drops the 'none' sentinel and the inactive frequency", () => {
    const prefs: NightlifePreference = {
      schemaVersion: 1,
      freeText: "",
      vibe: ["bars", "none"],
      frequency: "none",
      budget: null,
    };
    const summary = summarizeCategory("nightlife", prefs);
    expect(summary.chips).toEqual(["Bars"]);
  });

  it("treats a category with only free-text as non-empty", () => {
    const prefs: LogisticsPreference = {
      schemaVersion: 1,
      freeText: "no early mornings please",
      pace: null,
      wakeTime: null,
      transport: [],
      dailyBudget: null,
      mobilityNotes: "",
    };
    const summary = summarizeCategory("logistics", prefs);
    expect(summary.isEmpty).toBe(false);
    expect(summary.chips).toEqual([]);
    expect(summary.freeText).toBe("no early mornings please");
    expect(summary.wishlistTags).toEqual(["no early mornings please"]);
  });
});
