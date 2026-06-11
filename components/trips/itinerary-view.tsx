"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Landmark,
  Lock,
  MapPin,
  Martini,
  Mountain,
  Navigation,
  RefreshCw,
  Route,
  UtensilsCrossed,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  GenerationDoc,
  ItineraryBlock,
  ItineraryStop,
  StopTransport,
  TripItinerary,
} from "@/lib/api/types";
import { AdminLockTooltip } from "./admin-lock-tooltip";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  food_drink: UtensilsCrossed,
  outdoors_scenic: Mountain,
  nightlife: Martini,
  culture_local: Landmark,
  logistics: Route,
};

const BLOCK_LABEL: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

type ItineraryViewProps = {
  itinerary: TripItinerary;
  metrics?: GenerationDoc["metrics"];
  onRegenerate?: () => void;
  canRegenerate?: boolean;
};

export function ItineraryView({
  itinerary,
  metrics,
  onRegenerate,
  canRegenerate = true,
}: ItineraryViewProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const warnings = itinerary.manualPlanWarnings ?? [];

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-3xl font-semibold">Your itinerary</h2>
        {onRegenerate && (
          <AdminLockTooltip locked={!canRegenerate}>
            <Button
              variant="outline"
              size="sm"
              disabled={!canRegenerate}
              onClick={() => setConfirmOpen(true)}
            >
              {canRegenerate ? (
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              ) : (
                <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Regenerate
            </Button>
          </AdminLockTooltip>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Some manual plans couldn&apos;t be scheduled
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-200/90">
            {warnings.map((warning) => (
              <li key={warning.manualPlanId}>
                <span className="font-medium">{warning.activity}</span> — {warning.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-8">
        {itinerary.days.map((day, index) => (
          <div key={day.date ?? index}>
            <h3 className="mb-3 text-lg font-semibold">{formatDayHeading(index, day.date)}</h3>
            <div className="space-y-5">
              {day.blocks.map((block, blockIndex) => (
                <ItineraryBlockSection key={`${block.name}-${blockIndex}`} block={block} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {metrics && (
        <p className="text-xs text-muted-foreground/80">
          Generated in {(metrics.latencyMs / 1000).toFixed(1)}s · ~
          {metrics.totalTokens.toLocaleString()} tokens
        </p>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate itinerary?</DialogTitle>
            <DialogDescription>
              This replaces the current itinerary. Previous runs are kept.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                onRegenerate?.();
              }}
            >
              Regenerate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ItineraryBlockSection({ block }: { block: ItineraryBlock }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {BLOCK_LABEL[block.name] ?? block.title ?? block.name}
      </p>
      <ul className="space-y-3">
        {block.stops.map((stop, index) => (
          <StopCard key={stop.placeId || `${stop.name}-${index}`} stop={stop} />
        ))}
      </ul>
    </div>
  );
}

function StopCard({ stop }: { stop: ItineraryStop }) {
  const Icon = (stop.category && CATEGORY_ICON[stop.category]) || MapPin;
  return (
    <li className="rounded-lg border border-border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            {stop.time && <p className="text-xs font-medium text-primary">{stop.time}</p>}
            <p className="truncate font-medium">{stop.name}</p>
            {stop.address && (
              <p className="truncate text-sm text-muted-foreground">{stop.address}</p>
            )}
          </div>
        </div>
        {stop.suggested && (
          <Badge variant="secondary" className="flex-shrink-0 gap-1 text-[10px] uppercase tracking-wide">
            <Wand2 className="h-3 w-3" aria-hidden="true" /> AI-suggested
          </Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          <Navigation className="h-3 w-3" aria-hidden="true" />
          {formatTransport(stop.transport)}
        </span>
      </div>

      {stop.whyItFits && (
        <p className="mt-2 text-sm text-muted-foreground">{stop.whyItFits}</p>
      )}
    </li>
  );
}

function formatTransport(transport: ItineraryStop["transport"]): string {
  if (!transport) return "Not available";
  const { mode, durationText } = transport as StopTransport;
  const parts = [mode, durationText].map((p) => p?.trim()).filter(Boolean);
  return parts.length ? parts.join(" · ") : "Not available";
}

function formatDayHeading(index: number, date?: string | null): string {
  const dayLabel = `Day ${index + 1}`;
  if (!date) return dayLabel;
  const [year, month, dayOfMonth] = date.split("-").map(Number);
  if (!year || !month || !dayOfMonth) return dayLabel;
  const formatted = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, dayOfMonth));
  return `${dayLabel} — ${formatted}`;
}
