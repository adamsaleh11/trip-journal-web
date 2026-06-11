"use client";

import { CalendarClock, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CATEGORY_LABELS, type Preflight } from "./generation-preflight";
import type { ModelProvider, PreferenceCategory } from "@/lib/api/types";

type GenerationPreflightDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preflight: Preflight;
  onConfirm: () => void;
  isSubmitting?: boolean;
  isAdmin?: boolean;
  provider?: ModelProvider;
  onProviderChange?: (provider: ModelProvider) => void;
};

export function GenerationPreflightDialog({
  open,
  onOpenChange,
  preflight,
  onConfirm,
  isSubmitting = false,
  isAdmin = false,
  provider = "groq",
  onProviderChange,
}: GenerationPreflightDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate itinerary</DialogTitle>
          <DialogDescription>
            Here&apos;s what feeds this run. The AI fills any gaps and always
            includes your manual plans.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Travelers</h3>
            <ul className="space-y-2">
              {preflight.participants.map((participant) => (
                <li
                  key={participant.participantId}
                  className="rounded-md border border-border/70 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{participant.displayName}</span>
                    <Badge variant={participant.isClaimed ? "secondary" : "outline"}>
                      {participant.isClaimed ? "Claimed" : "Unclaimed"}
                    </Badge>
                  </div>
                  {participant.emptyCategoryLabels.length > 0 ? (
                    <p className="mt-1 flex items-start gap-1 text-xs text-primary">
                      <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
                      AI will fill: {participant.emptyCategoryLabels.join(", ")}
                    </p>
                  ) : (
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-300">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      All preferences set
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Category research</h3>
            <ul className="space-y-1.5">
              {preflight.categories.map((category) => (
                <li
                  key={category.category}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{category.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {category.likelyReused ? "Likely reused" : "Will run"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-accent" aria-hidden="true" />
              Manual plans (always included)
            </h3>
            {preflight.manualPlans.length === 0 ? (
              <p className="text-xs text-muted-foreground">No manual plans added.</p>
            ) : (
              <ul className="space-y-1.5">
                {preflight.manualPlans.map((plan) => (
                  <li key={plan.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{plan.activity}</span>
                    <span className="flex-shrink-0 text-xs capitalize text-muted-foreground">
                      {plan.timeOfDay} ·{" "}
                      {CATEGORY_LABELS[plan.category as PreferenceCategory] ?? plan.category}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {isAdmin && onProviderChange && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Itinerary model</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Category research always runs on Groq. As the trip admin you can
                pick which provider composes the final itinerary.
              </p>
              <ToggleGroup
                type="single"
                value={provider}
                onValueChange={(value) => {
                  if (value) onProviderChange(value as ModelProvider);
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="groq">Groq (default)</ToggleGroupItem>
                <ToggleGroupItem value="gemini">Gemini</ToggleGroupItem>
              </ToggleGroup>
            </section>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Starting…" : "Generate itinerary"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
