import { describe, expect, it } from "vitest";
import { buildPreflight } from "./generation-preflight";
import type {
  CompletionEntry,
  ManualPlan,
  Participant,
} from "@/lib/api/types";

const completions: CompletionEntry[] = [
  {
    participantId: "p1",
    displayName: "Adam",
    claimedByUid: "uid-adam",
    filled: {
      food_drink: true,
      outdoors_scenic: true,
      nightlife: true,
      culture_local: true,
      logistics: true,
    },
  },
  {
    participantId: "p2",
    displayName: "Mom",
    claimedByUid: null,
    filled: {
      food_drink: true,
      outdoors_scenic: false,
      nightlife: false,
      culture_local: true,
      logistics: false,
    },
  },
];

const participants: Participant[] = [
  { id: "p1", displayName: "Adam", claimedByUid: "uid-adam" },
  { id: "p2", displayName: "Mom", claimedByUid: null },
];

const manualPlans: ManualPlan[] = [
  {
    id: "mp1",
    category: "nightlife",
    activity: "Fado night",
    timeOfDay: "evening",
    createdByUid: "uid-adam",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
  },
];

describe("buildPreflight", () => {
  it("includes claimed and unclaimed participants with their empty categories", () => {
    const preflight = buildPreflight(completions, participants, manualPlans, {});

    expect(preflight.participants).toHaveLength(2);
    const adam = preflight.participants.find((p) => p.participantId === "p1")!;
    const mom = preflight.participants.find((p) => p.participantId === "p2")!;

    expect(adam.isClaimed).toBe(true);
    expect(adam.emptyCategoryLabels).toEqual([]);

    expect(mom.isClaimed).toBe(false);
    expect(mom.emptyCategoryLabels).toEqual([
      "Outdoors & Scenic",
      "Nightlife",
      "Logistics",
    ]);
  });

  it("hedges reuse from category freshness (exists + not stale)", () => {
    const preflight = buildPreflight(completions, participants, manualPlans, {
      food_drink: { exists: true, stale: false },
      nightlife: { exists: true, stale: true },
      culture_local: { exists: false, stale: false },
    });

    const byCategory = Object.fromEntries(
      preflight.categories.map((c) => [c.category, c.likelyReused]),
    );
    expect(byCategory.food_drink).toBe(true);
    expect(byCategory.nightlife).toBe(false); // stale -> will run
    expect(byCategory.culture_local).toBe(false); // missing -> will run
    expect(byCategory.logistics).toBe(false); // no freshness entry -> will run
  });

  it("carries manual plans through as separate context", () => {
    const preflight = buildPreflight(completions, participants, manualPlans, {});
    expect(preflight.manualPlans).toHaveLength(1);
    expect(preflight.manualPlans[0].activity).toBe("Fado night");
  });
});
