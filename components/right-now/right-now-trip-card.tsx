"use client";

import { Dice5, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRightNow } from "@/components/right-now/right-now-provider";

export function RightNowTripCard({
  tripId,
  destinationText,
}: {
  tripId: string;
  destinationText?: string | null;
}) {
  const { openRightNow } = useRightNow();

  return (
    <section className="rounded-lg border border-primary/25 bg-card/80 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Dice5 className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-xl font-semibold">Bored right now?</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Roll one spontaneous stop with this trip&apos;s context attached.
          </p>
        </div>
        <Button
          type="button"
          className="sm:min-w-36"
          onClick={() => openRightNow({ tripId, tripDestinationText: destinationText })}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Right Now
        </Button>
      </div>
    </section>
  );
}
