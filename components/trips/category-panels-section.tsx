"use client";

import { PreferenceCategory } from "@/lib/api/types";
import { CategoryAgentPanel } from "./category-agent-panel";

const CATEGORIES: Array<{ key: PreferenceCategory; label: string }> = [
  { key: "food_drink", label: "Food & Drink" },
  { key: "outdoors_scenic", label: "Outdoors & Scenic" },
  { key: "nightlife", label: "Nightlife" },
  { key: "culture_local", label: "Culture & Local" },
  { key: "logistics", label: "Logistics" },
];

export function CategoryPanelsSection({
  tripId,
  isAdmin = false,
}: {
  tripId: string;
  isAdmin?: boolean;
}) {
  return (
    <section className="rounded-lg border border-border bg-card/80 p-5 sm:p-6 mt-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Category Agents</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Run agents independently to preview recommendations for each category.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <CategoryAgentPanel
            key={cat.key}
            tripId={tripId}
            category={cat.key}
            label={cat.label}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </section>
  );
}
