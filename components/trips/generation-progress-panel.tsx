"use client";

import {
  AlertCircle,
  Check,
  Landmark,
  Loader2,
  Martini,
  Mountain,
  RefreshCw,
  Route,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GenerationDoc } from "@/lib/api/types";

type AgentKey = keyof GenerationDoc["agentStatuses"];
type AgentStatus = GenerationDoc["agentStatuses"][AgentKey];

const AGENTS: Array<{ key: AgentKey; label: string; icon: LucideIcon }> = [
  { key: "food_drink", label: "Food & Drink", icon: UtensilsCrossed },
  { key: "outdoors_scenic", label: "Outdoors & Scenic", icon: Mountain },
  { key: "nightlife", label: "Nightlife", icon: Martini },
  { key: "culture_local", label: "Culture & Local", icon: Landmark },
  { key: "logistics", label: "Logistics", icon: Route },
  { key: "coordinator", label: "Itinerary Coordinator", icon: Sparkles },
];

const PHASE_LABEL: Record<GenerationDoc["phase"], string> = {
  collecting_preferences: "Collecting everyone's preferences…",
  researching: "Researching real venues…",
  building_itinerary: "Building your day-by-day itinerary…",
  done: "Itinerary ready",
};

type GenerationProgressPanelProps = {
  doc: GenerationDoc;
  isStale?: boolean;
  onRetry?: () => void;
};

export function GenerationProgressPanel({
  doc,
  isStale = false,
  onRetry,
}: GenerationProgressPanelProps) {
  const isError = doc.status === "error";

  return (
    <section className="rounded-lg border border-border bg-card/80 p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Generating your itinerary</h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {isError
              ? "Something interrupted the run."
              : PHASE_LABEL[doc.phase]}
          </p>
        </div>
        {!isError && <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />}
      </div>

      <ul className="space-y-2">
        {AGENTS.map((agent) => (
          <AgentRow
            key={agent.key}
            label={agent.label}
            icon={agent.icon}
            status={doc.agentStatuses[agent.key]}
          />
        ))}
      </ul>

      {isStale && !isError && (
        <div className="mt-5 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          <p>This is taking longer than expected. The run may have stalled.</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          )}
        </div>
      )}

      {isError && (
        <div className="mt-5 rounded-md border border-destructive/35 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">
            {doc.error || "The itinerary couldn't be generated. Please try again."}
          </p>
          {onRetry && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Retry generation
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function AgentRow({
  label,
  icon: Icon,
  status,
}: {
  label: string;
  icon: LucideIcon;
  status: AgentStatus;
}) {
  const running = status === "running";
  return (
    <li
      className={`flex items-center justify-between rounded-md border border-border/70 px-3 py-2.5 transition-colors ${
        running ? "bg-primary/5" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon
          className={`h-4 w-4 flex-shrink-0 ${running ? "text-primary" : "text-muted-foreground"}`}
          aria-hidden="true"
        />
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <StatusIndicator status={status} />
    </li>
  );
}

function StatusIndicator({ status }: { status: AgentStatus }) {
  switch (status) {
    case "running":
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Running
        </span>
      );
    case "done":
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Done
        </span>
      );
    case "skipped_fresh":
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300/90">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Reused
        </span>
      );
    case "fallback":
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Fallback
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Error
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full border border-muted-foreground/40"
            aria-hidden="true"
          />
          Waiting
        </span>
      );
  }
}
